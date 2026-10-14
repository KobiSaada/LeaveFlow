import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asConstraintViolation,
  PG_ERROR,
} from '../../src/shared/infrastructure/database/pg-errors';
import { closeDataSource } from '../../src/shared/infrastructure/database/data-source';
import { insertUserRow, testDataSource } from '../support/db';

/**
 * Direct-SQL tests: each invariant must be enforced by PostgreSQL itself, bypassing the app.
 * (verification-checklist §10 — every constraint has a negative and a paired positive write.)
 */
let ds: DataSource;
let requesterId: string;
let validatorId: string;

beforeAll(async () => {
  ds = await testDataSource();
  requesterId = await insertUserRow(ds, { role: 'REQUESTER' });
  validatorId = await insertUserRow(ds, { role: 'VALIDATOR' });
});

afterAll(async () => {
  await closeDataSource();
});

interface RequestRow {
  userId?: string;
  start: string;
  end: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  idempotencyKey?: string | null;
}

async function insertRequest(row: RequestRow): Promise<string> {
  const id = randomUUID();
  await ds.query(
    `INSERT INTO vacation_requests
       (id, user_id, start_date, end_date, status, comments, decided_by, decided_at, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      row.userId ?? requesterId,
      row.start,
      row.end,
      row.status ?? 'PENDING',
      row.comments ?? null,
      row.decidedBy ?? null,
      row.decidedAt ?? null,
      row.idempotencyKey ?? null,
    ],
  );
  return id;
}

async function expectViolation(promise: Promise<unknown>, code: string, constraint: string) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, `expected ${constraint} to reject the write`).toBeDefined();
  expect(asConstraintViolation(error)).toEqual({ code, constraint });
}

const decided = (status: 'APPROVED' | 'REJECTED', comments: string | null = null) => ({
  status,
  comments,
  decidedBy: validatorId,
  decidedAt: new Date().toISOString(),
});

describe('vr_end_after_start', () => {
  it('rejects end equal to or before start', async () => {
    const userId = await insertUserRow(ds);
    await expectViolation(
      insertRequest({ userId, start: '2030-01-10', end: '2030-01-10' }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_end_after_start',
    );
    await expectViolation(
      insertRequest({ userId, start: '2030-01-10', end: '2030-01-09' }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_end_after_start',
    );
  });

  it('accepts end one day after start', async () => {
    const userId = await insertUserRow(ds);
    await expect(
      insertRequest({ userId, start: '2030-01-10', end: '2030-01-11' }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('vr_rejection_needs_comment', () => {
  it('rejects a REJECTED row with a missing or blank comment', async () => {
    const userId = await insertUserRow(ds);
    await expectViolation(
      insertRequest({
        userId,
        start: '2030-02-01',
        end: '2030-02-03',
        ...decided('REJECTED', null),
      }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_rejection_needs_comment',
    );
    await expectViolation(
      insertRequest({
        userId,
        start: '2030-02-01',
        end: '2030-02-03',
        ...decided('REJECTED', '   '),
      }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_rejection_needs_comment',
    );
  });

  it('accepts a REJECTED row with a comment', async () => {
    const userId = await insertUserRow(ds);
    await expect(
      insertRequest({
        userId,
        start: '2030-02-01',
        end: '2030-02-03',
        ...decided('REJECTED', 'Release freeze'),
      }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('vr_decision_consistency', () => {
  it('rejects a PENDING row carrying decision data', async () => {
    const userId = await insertUserRow(ds);
    await expectViolation(
      insertRequest({
        userId,
        start: '2030-03-01',
        end: '2030-03-02',
        decidedBy: validatorId,
        decidedAt: new Date().toISOString(),
      }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_decision_consistency',
    );
    await expectViolation(
      insertRequest({ userId, start: '2030-03-01', end: '2030-03-02', comments: 'premature' }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_decision_consistency',
    );
  });

  it('rejects an APPROVED row without decider or decision time', async () => {
    const userId = await insertUserRow(ds);
    await expectViolation(
      insertRequest({ userId, start: '2030-03-01', end: '2030-03-02', status: 'APPROVED' }),
      PG_ERROR.CHECK_VIOLATION,
      'vr_decision_consistency',
    );
  });

  it('accepts a consistent APPROVED row, with or without a comment', async () => {
    const userId = await insertUserRow(ds);
    await expect(
      insertRequest({ userId, start: '2030-03-01', end: '2030-03-02', ...decided('APPROVED') }),
    ).resolves.toBeTypeOf('string');
    await expect(
      insertRequest({
        userId,
        start: '2030-03-05',
        end: '2030-03-06',
        ...decided('APPROVED', 'Enjoy'),
      }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('vr_no_overlapping_active', () => {
  it('rejects overlapping active requests for the same user, including a shared boundary day', async () => {
    const userId = await insertUserRow(ds);
    await insertRequest({ userId, start: '2030-04-10', end: '2030-04-12' });
    await expectViolation(
      insertRequest({ userId, start: '2030-04-12', end: '2030-04-14' }),
      PG_ERROR.EXCLUSION_VIOLATION,
      'vr_no_overlapping_active',
    );
    await expectViolation(
      insertRequest({ userId, start: '2030-04-01', end: '2030-04-30', ...decided('APPROVED') }),
      PG_ERROR.EXCLUSION_VIOLATION,
      'vr_no_overlapping_active',
    );
  });

  it('accepts adjacent ranges, overlaps with rejected requests, and other users on the same dates', async () => {
    const userId = await insertUserRow(ds);
    const otherUserId = await insertUserRow(ds);
    await insertRequest({ userId, start: '2030-04-10', end: '2030-04-12' });
    await expect(
      insertRequest({ userId, start: '2030-04-13', end: '2030-04-14' }),
    ).resolves.toBeTypeOf('string');
    await insertRequest({
      userId,
      start: '2030-05-01',
      end: '2030-05-05',
      ...decided('REJECTED', 'No'),
    });
    await expect(
      insertRequest({ userId, start: '2030-05-01', end: '2030-05-05' }),
    ).resolves.toBeTypeOf('string');
    await expect(
      insertRequest({ userId: otherUserId, start: '2030-04-10', end: '2030-04-12' }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('users constraints', () => {
  it('rejects a non-lower-case email and a duplicate email', async () => {
    const email = `dup-${randomUUID()}@test.leaveflow.dev`;
    await expectViolation(
      insertUserRow(ds, { email: email.toUpperCase() }),
      PG_ERROR.CHECK_VIOLATION,
      'users_email_lowercase',
    );
    await insertUserRow(ds, { email });
    await expectViolation(
      insertUserRow(ds, { email }),
      PG_ERROR.UNIQUE_VIOLATION,
      'users_email_key',
    );
  });
});

describe('vr_user_idempotency_key', () => {
  it('rejects a reused key for the same user but accepts it for another user', async () => {
    const userId = await insertUserRow(ds);
    const otherUserId = await insertUserRow(ds);
    const key = randomUUID();
    await insertRequest({ userId, start: '2030-06-01', end: '2030-06-02', idempotencyKey: key });
    await expectViolation(
      insertRequest({ userId, start: '2030-07-01', end: '2030-07-02', idempotencyKey: key }),
      PG_ERROR.UNIQUE_VIOLATION,
      'vr_user_idempotency_key',
    );
    await expect(
      insertRequest({
        userId: otherUserId,
        start: '2030-06-01',
        end: '2030-06-02',
        idempotencyKey: key,
      }),
    ).resolves.toBeTypeOf('string');
  });
});

describe('DATE round-trip', () => {
  it('returns calendar dates exactly as written, as strings', async () => {
    const userId = await insertUserRow(ds);
    const id = await insertRequest({ userId, start: '2030-12-31', end: '2031-01-01' });
    const [row] = (await ds.query(
      `SELECT start_date, end_date FROM vacation_requests WHERE id = $1`,
      [id],
    )) as Array<{ start_date: unknown; end_date: unknown }>;
    expect(row).toEqual({ start_date: '2030-12-31', end_date: '2031-01-01' });
  });
});

describe('migrations', () => {
  it('revert and re-apply cleanly (down → up)', async () => {
    await ds.undoLastMigration({ transaction: 'each' });
    const [afterDown] = (await ds.query(
      `SELECT to_regclass('public.vacation_requests') AS t`,
    )) as Array<{ t: string | null }>;
    expect(afterDown?.t).toBeNull();
    await ds.runMigrations({ transaction: 'each' });
    const [afterUp] = (await ds.query(
      `SELECT to_regclass('public.vacation_requests') AS t`,
    )) as Array<{ t: string | null }>;
    expect(afterUp?.t).toBe('vacation_requests');
  });
});
