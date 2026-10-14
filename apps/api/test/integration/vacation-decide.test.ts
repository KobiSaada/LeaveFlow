import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDataSource } from '../../src/shared/infrastructure/database/data-source';
import {
  call,
  createUser,
  eventsFor,
  requestRow,
  submit,
  type TestUser,
  useFixedClock,
} from '../support/api';

let requester: TestUser;
let dana: TestUser;
let yossi: TestUser;
let nextMonth = 0;

/** Each request gets its own month so the requester's ranges never overlap. */
async function pending(): Promise<string> {
  nextMonth += 1;
  const year = 2028 + Math.floor(nextMonth / 12);
  const month = String((nextMonth % 12) + 1).padStart(2, '0');
  const res = await submit(requester, `${year}-${month}-01`, `${year}-${month}-03`, {
    reason: 'Private reason text',
  });
  return res.body.id;
}

const approve = (user: TestUser, id: string, comment?: string) =>
  call('POST', `/vacation-requests/${id}/approve`, {
    token: user.token,
    body: comment === undefined ? undefined : { comment },
  });
const reject = (user: TestUser, id: string, comment?: string | null) =>
  call('POST', `/vacation-requests/${id}/reject`, {
    token: user.token,
    body: comment === undefined ? {} : { comment },
  });

beforeAll(async () => {
  useFixedClock();
  requester = await createUser('REQUESTER');
  dana = await createUser('VALIDATOR', 'Dana Integration');
  yossi = await createUser('VALIDATOR', 'Yossi Integration');
});
afterAll(() => closeDataSource());

describe('approve (AC-13)', () => {
  it('moves PENDING to APPROVED, records the decider and one Approved event', async () => {
    const id = await pending();
    const res = await approve(dana, id, 'Enjoy!');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      status: 'APPROVED',
      comments: 'Enjoy!',
      decidedBy: { id: dana.id, name: 'Dana Integration' },
    });
    const row = await requestRow(id);
    expect(row).toMatchObject({ status: 'APPROVED', decided_by: dana.id, comments: 'Enjoy!' });
    expect(row?.decided_at).toBeInstanceOf(Date);
    expect((await eventsFor(id)).map((e) => e.event_type)).toEqual([
      'VacationRequestCreated',
      'VacationRequestApproved',
    ]);
  });

  it('answers 404 for an unknown request', async () => {
    expect(await approve(dana, randomUUID())).toMatchObject({
      status: 404,
      body: { code: 'NOT_FOUND' },
    });
  });
});

describe('reject (AC-15, BR-5)', () => {
  it.each([[undefined], [null], [''], ['    ']])(
    'refuses comment %j with 422 and leaves the row pending',
    async (comment) => {
      const id = await pending();
      expect(await reject(dana, id, comment)).toMatchObject({
        status: 422,
        body: { code: 'REJECTION_COMMENT_REQUIRED' },
      });
      expect((await requestRow(id))?.status).toBe('PENDING');
      expect(await eventsFor(id)).toHaveLength(1);
    },
  );

  it('persists the exact comment', async () => {
    const id = await pending();
    const res = await reject(dana, id, 'Overlaps the release freeze');
    expect(res.body).toMatchObject({ status: 'REJECTED', comments: 'Overlaps the release freeze' });
    expect(await requestRow(id)).toMatchObject({
      status: 'REJECTED',
      comments: 'Overlaps the release freeze',
      decided_by: dana.id,
    });
    expect((await eventsFor(id)).map((e) => e.event_type)).toEqual([
      'VacationRequestCreated',
      'VacationRequestRejected',
    ]);
  });
});

describe('terminal statuses (AC-16, BR-3)', () => {
  it('refuses to reject an approved request, naming who approved it', async () => {
    const id = await pending();
    await approve(dana, id);
    const res = await reject(yossi, id, 'Too late');
    expect(res).toMatchObject({
      status: 409,
      body: {
        code: 'REQUEST_NOT_PENDING',
        currentStatus: 'APPROVED',
        decidedBy: { id: dana.id, name: 'Dana Integration' },
      },
    });
    expect(await requestRow(id)).toMatchObject({
      status: 'APPROVED',
      decided_by: dana.id,
      comments: null,
    });
  });

  it('refuses to approve a rejected request', async () => {
    const id = await pending();
    await reject(dana, id, 'No');
    expect(await approve(yossi, id)).toMatchObject({
      status: 409,
      body: { code: 'REQUEST_NOT_PENDING', currentStatus: 'REJECTED' },
    });
    expect((await requestRow(id))?.status).toBe('REJECTED');
  });
});

describe('idempotent repeat (AC-17)', () => {
  it('returns 200 for approving twice and keeps a single Approved event', async () => {
    const id = await pending();
    await approve(dana, id);
    const again = await approve(yossi, id);
    expect(again).toMatchObject({
      status: 200,
      body: { status: 'APPROVED', decidedBy: { id: dana.id } },
    });
    expect(
      (await eventsFor(id)).filter((e) => e.event_type === 'VacationRequestApproved'),
    ).toHaveLength(1);
  });
});

describe('concurrent decisions (AC-18, VR-04)', () => {
  it('lets exactly one of a parallel approve and reject win, every time', async () => {
    for (let round = 0; round < 5; round += 1) {
      const id = await pending();
      const [a, r] = await Promise.all([
        approve(dana, id),
        reject(yossi, id, 'Conflicting decision'),
      ]);
      const statuses = [a.status, r.status].sort();
      expect(statuses, `round ${round}`).toEqual([200, 409]);
      const winner = a.status === 200 ? 'APPROVED' : 'REJECTED';
      expect((await requestRow(id))?.status).toBe(winner);
      const decisions = (await eventsFor(id)).filter(
        (e) => e.event_type !== 'VacationRequestCreated',
      );
      expect(decisions).toHaveLength(1);
      expect(decisions[0]?.event_type).toBe(
        winner === 'APPROVED' ? 'VacationRequestApproved' : 'VacationRequestRejected',
      );
    }
  });

  it('turns 5 parallel identical approvals into one decision and one event', async () => {
    const id = await pending();
    const results = await Promise.all(Array.from({ length: 5 }, () => approve(dana, id)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(
      (await eventsFor(id)).filter((e) => e.event_type === 'VacationRequestApproved'),
    ).toHaveLength(1);
  });
});
