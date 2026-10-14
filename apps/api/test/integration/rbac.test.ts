import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDataSource } from '../../src/shared/database/data-source';
import { call, createUser, requestRow, submit, type TestUser, useFixedClock } from '../support/api';

/** Epic §14 permissions matrix, endpoint by endpoint (checklist §13). */
let requester: TestUser;
let validator: TestUser;
let pendingId: string;

beforeAll(async () => {
  useFixedClock();
  requester = await createUser('REQUESTER');
  validator = await createUser('VALIDATOR');
  pendingId = (await submit(requester, '2027-01-10', '2027-01-12')).body.id;
});
afterAll(() => closeDataSource());

type Role = 'REQUESTER' | 'VALIDATOR';
const routes: Array<{
  name: string;
  method: string;
  path: () => string;
  body?: unknown;
  query?: Record<string, string>;
  allowed: Role[];
}> = [
  {
    name: 'create request',
    method: 'POST',
    path: () => '/vacation-requests',
    body: { startDate: '2027-05-01', endDate: '2027-05-02' },
    allowed: ['REQUESTER'],
  },
  {
    name: 'list own requests',
    method: 'GET',
    path: () => '/me/vacation-requests',
    allowed: ['REQUESTER'],
  },
  {
    name: 'list all requests',
    method: 'GET',
    path: () => '/vacation-requests',
    allowed: ['VALIDATOR'],
  },
  {
    name: 'approve',
    method: 'POST',
    path: () => `/vacation-requests/${pendingId}/approve`,
    allowed: ['VALIDATOR'],
  },
  {
    name: 'reject',
    method: 'POST',
    path: () => `/vacation-requests/${pendingId}/reject`,
    body: { comment: 'x' },
    allowed: ['VALIDATOR'],
  },
  { name: 'list users', method: 'GET', path: () => '/users', allowed: ['VALIDATOR'] },
  {
    name: 'team calendar',
    method: 'GET',
    path: () => '/team-calendar',
    query: { from: '2027-01-01', to: '2027-01-31' },
    allowed: ['REQUESTER', 'VALIDATOR'],
  },
  { name: 'me', method: 'GET', path: () => '/auth/me', allowed: ['REQUESTER', 'VALIDATOR'] },
];

describe.each(routes)('$method $name', (route) => {
  it('requires authentication (401)', async () => {
    const res = await call(route.method, route.path(), { body: route.body, query: route.query });
    expect(res.status).toBe(401);
  });

  for (const role of ['REQUESTER', 'VALIDATOR'] as const) {
    const allowed = route.allowed.includes(role);
    it(`${allowed ? 'allows' : 'forbids (403)'} ${role}`, async () => {
      const user = role === 'REQUESTER' ? requester : validator;
      const res = await call(route.method, route.path(), {
        token: user.token,
        body: route.body,
        query: route.query,
      });
      if (allowed) expect([401, 403]).not.toContain(res.status);
      else expect(res).toMatchObject({ status: 403, body: { code: 'FORBIDDEN' } });
    });
  }
});

describe('forbidden attempts change nothing (AC-3)', () => {
  it('leaves the request pending after a requester tries to approve and reject it', async () => {
    const id = (await submit(requester, '2027-02-10', '2027-02-12')).body.id;
    await call('POST', `/vacation-requests/${id}/approve`, { token: requester.token });
    await call('POST', `/vacation-requests/${id}/reject`, {
      token: requester.token,
      body: { comment: 'x' },
    });
    expect((await requestRow(id))?.status).toBe('PENDING');
  });
});

describe('IDOR (checklist §13)', () => {
  it("hides another user's request: 404, not 403", async () => {
    const other = await createUser('REQUESTER');
    const res = await call('GET', `/vacation-requests/${pendingId}/events`, { token: other.token });
    expect(res).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
    const missing = await call('GET', `/vacation-requests/${randomUUID()}/events`, {
      token: other.token,
    });
    expect(missing.body).toMatchObject({ status: 404, code: 'NOT_FOUND', title: res.body.title });
  });

  it('ignores a userId parameter on the requester list', async () => {
    const other = await createUser('REQUESTER');
    const res = await call('GET', '/me/vacation-requests', {
      token: other.token,
      query: { userId: requester.id },
    });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});
