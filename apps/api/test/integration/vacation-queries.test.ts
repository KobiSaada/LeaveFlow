import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDataSource } from '../../src/shared/database/data-source';
import { insertUserRow, testDataSource } from '../support/db';
import { call, createUser, submit, type TestUser, useFixedClock } from '../support/api';

let alice: TestUser;
let bob: TestUser;
let dana: TestUser;

beforeAll(async () => {
  useFixedClock();
  alice = await createUser('REQUESTER');
  bob = await createUser('REQUESTER');
  dana = await createUser('VALIDATOR');
});
afterAll(() => closeDataSource());

describe('GET /me/vacation-requests (AC-10)', () => {
  it("returns only the caller's requests, newest first, with page info", async () => {
    const first = await submit(alice, '2029-01-01', '2029-01-03');
    const second = await submit(alice, '2029-02-01', '2029-02-03');
    await submit(bob, '2029-01-01', '2029-01-03');
    const res = await call('GET', '/me/vacation-requests', { token: alice.token });
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([
      second.body.id,
      first.body.id,
    ]);
    expect(res.body.items.every((i: { userId: string }) => i.userId === alice.id)).toBe(true);
    expect(res.body.pageInfo).toEqual({ page: 1, pageSize: 20, totalItems: 2, totalPages: 1 });
  });
});

describe('GET /vacation-requests filters (AC-11)', () => {
  it('filters by status, by user, and by both', async () => {
    const carol = await createUser('REQUESTER');
    const p1 = await submit(carol, '2029-03-01', '2029-03-03');
    const p2 = await submit(carol, '2029-04-01', '2029-04-03');
    await call('POST', `/vacation-requests/${p2.body.id}/approve`, { token: dana.token });

    const byUser = await call('GET', '/vacation-requests', {
      token: dana.token,
      query: { userId: carol.id },
    });
    expect(byUser.body.pageInfo.totalItems).toBe(2);

    const both = await call('GET', '/vacation-requests', {
      token: dana.token,
      query: { userId: carol.id, status: 'PENDING' },
    });
    expect(both.body.items.map((i: { id: string }) => i.id)).toEqual([p1.body.id]);
    expect(both.body.pageInfo.totalItems).toBe(1);

    const approved = await call('GET', '/vacation-requests', {
      token: dana.token,
      query: { status: 'APPROVED', pageSize: '100' },
    });
    expect(approved.body.items.every((i: { status: string }) => i.status === 'APPROVED')).toBe(
      true,
    );
    expect(approved.body.items.map((i: { id: string }) => i.id)).toContain(p2.body.id);
  });

  it('rejects invalid filters with field errors', async () => {
    const res = await call('GET', '/vacation-requests', {
      token: dana.token,
      query: { status: 'CANCELLED', userId: 'x', pageSize: '101' },
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'pageSize',
      'status',
      'userId',
    ]);
  });
});

describe('stable pagination (AC-12)', () => {
  it('pages through 25 rows sharing one created_at without duplicates or gaps', async () => {
    const ds = await testDataSource();
    const userId = await insertUserRow(ds);
    const ids: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      const id = randomUUID();
      ids.push(id);
      const day = String(1 + (i % 28)).padStart(2, '0');
      const month = String(1 + Math.floor(i / 28) * 0 + (i % 12)).padStart(2, '0');
      await ds.query(
        `INSERT INTO vacation_requests (id, user_id, start_date, end_date, created_at, updated_at)
         VALUES ($1, $2, $3::date, $3::date + 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
        [id, userId, `${2030 + i}-${month}-${day}`],
      );
    }
    const seen: string[] = [];
    for (const page of ['1', '2', '3']) {
      const res = await call('GET', '/vacation-requests', {
        token: dana.token,
        query: { userId, page, pageSize: '10' },
      });
      expect(res.body.pageInfo).toMatchObject({ totalItems: 25, totalPages: 3 });
      seen.push(...res.body.items.map((i: { id: string }) => i.id));
    }
    expect(seen).toHaveLength(25);
    expect(new Set(seen)).toEqual(new Set(ids));
  });
});

describe('GET /team-calendar (AC-19)', () => {
  it('returns active requests of everyone intersecting the window, without reason or comments', async () => {
    const erin = await createUser('REQUESTER', 'Erin Calendar');
    const approved = await submit(erin, '2031-05-04', '2031-05-08', { reason: 'Secret' });
    await call('POST', `/vacation-requests/${approved.body.id}/approve`, {
      token: dana.token,
      body: { comment: 'Private note' },
    });
    const pendingOne = await submit(erin, '2031-05-28', '2031-06-02');
    const rejected = await submit(erin, '2031-05-15', '2031-05-16');
    await call('POST', `/vacation-requests/${rejected.body.id}/reject`, {
      token: dana.token,
      body: { comment: 'No' },
    });
    const outside = await submit(erin, '2031-07-01', '2031-07-02');

    for (const user of [alice, dana]) {
      const res = await call('GET', '/team-calendar', {
        token: user.token,
        query: { from: '2031-05-01', to: '2031-05-31' },
      });
      expect(res.status).toBe(200);
      const mine = res.body.items.filter((i: { userId: string }) => i.userId === erin.id);
      expect(mine).toEqual([
        {
          id: approved.body.id,
          userId: erin.id,
          userName: 'Erin Calendar',
          startDate: '2031-05-04',
          endDate: '2031-05-08',
          status: 'APPROVED',
        },
        {
          id: pendingOne.body.id,
          userId: erin.id,
          userName: 'Erin Calendar',
          startDate: '2031-05-28',
          endDate: '2031-06-02',
          status: 'PENDING',
        },
      ]);
      expect(mine.map((i: { id: string }) => i.id)).not.toContain(outside.body.id);
      for (const item of res.body.items) {
        expect(item).not.toHaveProperty('reason');
        expect(item).not.toHaveProperty('comments');
      }
    }
  });

  it('requires a valid window of at most 92 days', async () => {
    expect((await call('GET', '/team-calendar', { token: alice.token })).status).toBe(422);
    expect(
      (
        await call('GET', '/team-calendar', {
          token: alice.token,
          query: { from: '2031-01-01', to: '2031-04-03' },
        })
      ).status,
    ).toBe(422);
  });
});

describe('GET /vacation-requests/:id/events (FR-34)', () => {
  it('lists the audit trail with actors, for the owner and validators', async () => {
    const res = await submit(alice, '2029-06-01', '2029-06-03');
    await call('POST', `/vacation-requests/${res.body.id}/approve`, { token: dana.token });
    for (const user of [alice, dana]) {
      const events = await call('GET', `/vacation-requests/${res.body.id}/events`, {
        token: user.token,
      });
      expect(
        events.body.items.map((e: { eventType: string; actor: { id: string } }) => [
          e.eventType,
          e.actor.id,
        ]),
      ).toEqual([
        ['VacationRequestCreated', alice.id],
        ['VacationRequestApproved', dana.id],
      ]);
    }
  });
});

describe('query plans (checklist §10)', () => {
  it.each([
    [
      'dashboard by status',
      `SELECT id FROM vacation_requests WHERE status = 'PENDING' ORDER BY created_at DESC, id DESC LIMIT 20`,
      'vr_status_created_idx',
    ],
    [
      'requests by user',
      `SELECT id FROM vacation_requests WHERE user_id = '00000000-0000-4000-8000-000000000000' ORDER BY created_at DESC, id DESC LIMIT 20`,
      'vr_user_created_idx',
    ],
    [
      'dashboard unfiltered',
      `SELECT id FROM vacation_requests ORDER BY created_at DESC, id DESC LIMIT 20`,
      'vr_created_idx',
    ],
  ])('%s uses its index', async (_label, sql, index) => {
    const ds = await testDataSource();
    const runner = ds.createQueryRunner();
    try {
      await runner.startTransaction();
      await runner.query('ANALYZE vacation_requests'); // fresh statistics: deterministic plans
      await runner.query('SET LOCAL enable_seqscan = off'); // tiny test tables would otherwise favour a seq scan
      const plan = (await runner.query(`EXPLAIN ${sql}`)) as Array<{ 'QUERY PLAN': string }>;
      expect(plan.map((p) => p['QUERY PLAN']).join('\n')).toContain(index);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
