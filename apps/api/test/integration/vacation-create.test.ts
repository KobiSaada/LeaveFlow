import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDataSource } from '../../src/shared/infrastructure/database/data-source';
import { testDataSource } from '../support/db';
import {
  call,
  createUser,
  eventsFor,
  requestRow,
  submit,
  TODAY,
  useFixedClock,
} from '../support/api';

beforeAll(() => useFixedClock());
afterAll(() => closeDataSource());

describe('create (AC-4)', () => {
  it('persists a PENDING row owned by the caller and exactly one Created event', async () => {
    const alice = await createUser('REQUESTER');
    const res = await submit(alice, '2026-11-09', '2026-11-13', { reason: '  Family trip ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: alice.id,
      userName: alice.name,
      startDate: '2026-11-09',
      endDate: '2026-11-13',
      reason: 'Family trip',
      status: 'PENDING',
      decidedBy: null,
    });

    const row = await requestRow(res.body.id);
    expect(row).toMatchObject({
      user_id: alice.id,
      status: 'PENDING',
      start_date: '2026-11-09',
      end_date: '2026-11-13',
      reason: 'Family trip',
    });
    const events = await eventsFor(res.body.id);
    expect(events).toEqual([
      {
        event_type: 'VacationRequestCreated',
        actor_id: alice.id,
        payload: { userId: alice.id, startDate: '2026-11-09', endDate: '2026-11-13' },
      },
    ]);
  });
});

describe('BR-1 end strictly after start (AC-5)', () => {
  it.each([
    ['equal dates', '2026-11-20', '2026-11-20'],
    ['end before start', '2026-11-20', '2026-11-19'],
  ])('rejects %s with 422 and writes nothing', async (_label, start, end) => {
    const user = await createUser('REQUESTER');
    const res = await submit(user, start, end);
    expect(res).toMatchObject({ status: 422, body: { code: 'INVALID_DATE_RANGE' } });
    const ds = await testDataSource();
    expect(
      await ds.query(`SELECT 1 FROM vacation_requests WHERE user_id = $1`, [user.id]),
    ).toHaveLength(0);
  });
});

describe('BR-4 no past start (AC-6)', () => {
  it(`rejects a start before ${TODAY} and accepts ${TODAY} itself`, async () => {
    const user = await createUser('REQUESTER');
    expect(await submit(user, '2026-10-13', '2026-10-15')).toMatchObject({
      status: 422,
      body: { code: 'START_DATE_IN_PAST' },
    });
    expect((await submit(user, TODAY, '2026-10-15')).status).toBe(201);
  });
});

describe('BR-2 no overlap, inclusive (AC-7)', () => {
  it('rejects full, partial, containing and shared-boundary overlaps with the conflicting range', async () => {
    const user = await createUser('REQUESTER');
    const first = await submit(user, '2026-12-09', '2026-12-13');
    for (const [start, end] of [
      ['2026-12-09', '2026-12-13'],
      ['2026-12-10', '2026-12-11'],
      ['2026-12-01', '2026-12-31'],
      ['2026-12-13', '2026-12-15'],
      ['2026-12-05', '2026-12-09'],
    ]) {
      const res = await submit(user, start!, end!);
      expect(res, `${start}..${end}`).toMatchObject({
        status: 409,
        body: {
          code: 'VACATION_OVERLAP',
          conflictingRange: { id: first.body.id, startDate: '2026-12-09', endDate: '2026-12-13' },
        },
      });
    }
  });

  it('accepts the day after, a range over a rejected request, and other users on the same dates', async () => {
    const user = await createUser('REQUESTER');
    const validator = await createUser('VALIDATOR');
    await submit(user, '2026-12-09', '2026-12-13');
    expect((await submit(user, '2026-12-14', '2026-12-15')).status).toBe(201);

    const rejected = await submit(user, '2027-01-05', '2027-01-07');
    await call('POST', `/vacation-requests/${rejected.body.id}/reject`, {
      token: validator.token,
      body: { comment: 'Freeze' },
    });
    expect((await submit(user, '2027-01-05', '2027-01-07')).status).toBe(201);

    const colleague = await createUser('REQUESTER');
    expect((await submit(colleague, '2026-12-09', '2026-12-13')).status).toBe(201);
  });
});

describe('concurrency (AC-8, VR-04)', () => {
  it('lets exactly one of 10 parallel overlapping submissions win', { repeats: 10 }, async () => {
    const user = await createUser('REQUESTER');
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => submit(user, '2027-02-01', `2027-02-0${2 + (i % 7)}`)),
    );
    const outcome = results.map((r) => `${r.status}:${r.body.code ?? 'ok'}`).join(', ');
    expect(
      results.filter((r) => r.status === 201),
      outcome,
    ).toHaveLength(1);
    expect(
      results.filter((r) => r.status === 409).every((r) => r.body.code === 'VACATION_OVERLAP'),
      outcome,
    ).toBe(true);
    expect(results.filter((r) => r.status === 409)).toHaveLength(9);

    const ds = await testDataSource();
    const rows = await ds.query(`SELECT id FROM vacation_requests WHERE user_id = $1`, [user.id]);
    expect(rows).toHaveLength(1);
    const events = await ds.query(
      `SELECT 1 FROM domain_events WHERE actor_id = $1 AND event_type = 'VacationRequestCreated'`,
      [user.id],
    );
    expect(events).toHaveLength(1);
  });
});

describe('Idempotency-Key (AC-9)', () => {
  it('replays the original request for the same key and payload', async () => {
    const user = await createUser('REQUESTER');
    const key = randomUUID();
    const first = await submit(user, '2027-03-01', '2027-03-05', { reason: 'Ski', key });
    const retry = await submit(user, '2027-03-01', '2027-03-05', { reason: 'Ski', key });
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(await eventsFor(first.body.id)).toHaveLength(1);
  });

  it('refuses the same key with a different payload', async () => {
    const user = await createUser('REQUESTER');
    const key = randomUUID();
    await submit(user, '2027-03-01', '2027-03-05', { key });
    expect(await submit(user, '2027-04-01', '2027-04-05', { key })).toMatchObject({
      status: 409,
      body: { code: 'IDEMPOTENCY_KEY_REUSED' },
    });
  });

  // Repeated: the losing-race paths (unique index, exclusion constraint, deadlock retry) are
  // timing-dependent, and a single round passed while a deadlock still surfaced as a 500.
  it('resolves 8 parallel retries with one key to a single request', { repeats: 15 }, async () => {
    const user = await createUser('REQUESTER');
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => submit(user, '2027-06-01', '2027-06-03', { key })),
    );
    const outcome = results.map((r) => `${r.status}:${r.body.code ?? 'ok'}`).join(', ');
    expect(
      results.every((r) => r.status === 201 || r.status === 200),
      outcome,
    ).toBe(true);
    expect(
      results.filter((r) => r.status === 201),
      outcome,
    ).toHaveLength(1);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    const ds = await testDataSource();
    expect(
      await ds.query(`SELECT 1 FROM vacation_requests WHERE user_id = $1`, [user.id]),
    ).toHaveLength(1);
  });

  it('rejects a key that is not a UUID', async () => {
    const user = await createUser('REQUESTER');
    expect(await submit(user, '2027-03-01', '2027-03-05', { key: 'abc' })).toMatchObject({
      status: 422,
      body: { code: 'VALIDATION_FAILED' },
    });
  });
});

describe('calendar dates under foreign process time zones (checklist §11 flip variant)', () => {
  it.each(['Pacific/Kiritimati', 'America/Los_Angeles'])(
    'round-trips dates unchanged with TZ=%s',
    async (tz) => {
      const previous = process.env.TZ;
      process.env.TZ = tz;
      try {
        const user = await createUser('REQUESTER');
        const res = await submit(user, TODAY, '2026-10-16');
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ startDate: TODAY, endDate: '2026-10-16' });
        const list = await call('GET', '/me/vacation-requests', { token: user.token });
        expect(list.body.items[0]).toMatchObject({ startDate: TODAY, endDate: '2026-10-16' });
      } finally {
        process.env.TZ = previous;
      }
    },
  );
});
