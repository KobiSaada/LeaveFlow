import { Writable } from 'node:stream';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getContainer } from '../../src/bootstrap/container';
import { closeDataSource } from '../../src/shared/infrastructure/database/data-source';
import { createLogger, setRootLogger } from '../../src/shared/infrastructure/logger';
import {
  call,
  createUser,
  submit,
  TEST_PASSWORD,
  type TestUser,
  useFixedClock,
} from '../support/api';

let alice: TestUser;
let dana: TestUser;

beforeAll(async () => {
  useFixedClock();
  alice = await createUser('REQUESTER');
  dana = await createUser('VALIDATOR');
});
afterEach(() => {
  vi.restoreAllMocks();
  setRootLogger(undefined);
});
afterAll(() => closeDataSource());

/** Installs a logger with the production configuration (incl. redaction) writing into memory. */
function captureLogs(): Array<Record<string, unknown>> {
  const lines: Array<Record<string, unknown>> = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      for (const line of String(chunk).trim().split('\n'))
        lines.push(JSON.parse(line) as Record<string, unknown>);
      done();
    },
  });
  setRootLogger(createLogger({ level: 'info', destination }));
  return lines;
}

describe('Problem Details contract (AC-20)', () => {
  it('uses application/problem+json, a stable code and the x-request-id', async () => {
    const res = await call('POST', '/vacation-requests', {
      token: alice.token,
      rawBody: '{"startDate":',
    });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toBe('application/problem+json');
    expect(res.body).toMatchObject({
      status: 400,
      code: 'MALFORMED_JSON',
      type: 'urn:leaveflow:problem:malformed-json',
    });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('reports an impossible calendar date as a field error', async () => {
    const res = await submit(alice, '2026-02-30', '2026-03-02');
    expect(res).toMatchObject({
      status: 422,
      body: { code: 'VALIDATION_FAILED', errors: [{ field: 'startDate' }] },
    });
  });

  it('echoes a well-formed incoming x-request-id and replaces a malformed one', async () => {
    expect(
      (await call('GET', '/health', { headers: { 'x-request-id': 'trace-123' } })).headers[
        'x-request-id'
      ],
    ).toBe('trace-123');
    expect(
      (await call('GET', '/health', { headers: { 'x-request-id': 'bad id\nINJECTED' } })).headers[
        'x-request-id'
      ],
    ).not.toContain('INJECTED');
  });

  it('answers unknown routes with ROUTE_NOT_FOUND', async () => {
    expect(await call('GET', '/nope')).toMatchObject({
      status: 404,
      body: { code: 'ROUTE_NOT_FOUND' },
    });
  });

  it('hides CEF runtime built-ins outside development (AC-25)', async () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect((await call('GET', '/context')).status).toBe(404);
    expect((await call('GET', '/dependencies')).status).toBe(404);
  });
});

describe('unexpected errors (AC-21)', () => {
  it('return a generic 500 with no internals, and the next request is served', async () => {
    const container = await getContainer();
    vi.spyOn(container.services.vacationRequests, 'listMine').mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 10.1.2.3:5432 password=hunter2'),
    );
    const res = await call('GET', '/me/vacation-requests', { token: alice.token });
    expect(res).toMatchObject({
      status: 500,
      body: { code: 'INTERNAL_ERROR', title: 'An unexpected error occurred.' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|hunter2|stack|at /);
    expect((await call('GET', '/me/vacation-requests', { token: alice.token })).status).toBe(200);
  });
});

describe('events after commit (checklist §15)', () => {
  it('a failing subscriber neither fails the request nor loses the committed state', async () => {
    const container = await getContainer();
    const reported = vi.fn();
    container.eventBus.subscribe('VacationRequestCreated', 'test-broken-subscriber', () => {
      reported();
      throw new Error('mail server down');
    });
    const res = await submit(alice, '2032-01-01', '2032-01-03');
    expect(res.status).toBe(201);
    expect(reported).toHaveBeenCalled();
    const list = await call('GET', '/me/vacation-requests', {
      token: alice.token,
      query: { pageSize: '100' },
    });
    expect(list.body.items.map((i: { id: string }) => i.id)).toContain(res.body.id);
  });

  it('publishes nothing for a command that fails', async () => {
    const container = await getContainer();
    const seen = vi.fn();
    container.eventBus.subscribe('VacationRequestApproved', 'test-spy', seen);
    const res = await submit(alice, '2032-02-01', '2032-02-03');
    await call('POST', `/vacation-requests/${res.body.id}/reject`, {
      token: dana.token,
      body: { comment: 'No' },
    });
    await call('POST', `/vacation-requests/${res.body.id}/approve`, { token: dana.token }); // 409
    expect(seen).not.toHaveBeenCalled();
  });
});

describe('structured logs (AC-26, checklist §13)', () => {
  it('log one line per request with correlation fields and never secrets or free text', async () => {
    const lines = captureLogs();
    const reason = `reason-${Date.now()}-confidential`;
    const comment = `comment-${Date.now()}-confidential`;
    await call('POST', '/auth/login', { body: { email: alice.email, password: TEST_PASSWORD } });
    const created = await submit(alice, '2033-01-01', '2033-01-03', { reason });
    await call('POST', `/vacation-requests/${created.body.id}/reject`, {
      token: dana.token,
      body: { comment },
    });

    const requestLines = lines.filter((l) => l.msg === 'request completed');
    expect(requestLines.length).toBeGreaterThanOrEqual(3);
    for (const line of requestLines) {
      expect(line).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          method: expect.any(String),
          path: expect.any(String),
          status: expect.any(Number),
          durationMs: expect.any(Number),
        }),
      );
    }
    expect(
      lines.some(
        (l) =>
          l.command === 'RejectVacationRequestCommand' &&
          l.outcome === 'success' &&
          l.userId === dana.id,
      ),
    ).toBe(true);

    const all = JSON.stringify(lines);
    for (const secret of [TEST_PASSWORD, alice.token, dana.token, reason, comment]) {
      expect(all).not.toContain(secret);
    }
  });
});
