import { randomUUID } from 'node:crypto';
import type { UserRole } from '@leaveflow/contracts';
import bcrypt from 'bcryptjs';
import type { Context } from 'commoneventframework';
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent';
import { configureContainer, getContainer } from '../../src/bootstrap/container';
import { handler } from '../../src/index';
import { FixedClock } from '../../src/shared/time/clock';
import { insertUserRow, testDataSource } from './db';

/** "Today" for every integration test, so date rules are deterministic. */
export const TODAY = '2026-10-14';
export const TEST_PASSWORD = 'Correct-Horse-1';
const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 4);

export function useFixedClock(today = TODAY): void {
  configureContainer({ clock: new FixedClock(today) });
}

export interface ApiResponse<T = any> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface CallOptions {
  token?: string;
  body?: unknown;
  /** Raw body string, sent as-is (for malformed JSON tests). */
  rawBody?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

/** Drives the real CEF Lambda handler with a CommonEvent — the same entry production uses. */
export async function call<T = any>(
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<ApiResponse<T>> {
  const event: CommonEvent = {
    path,
    method,
    body: options.rawBody ?? (options.body === undefined ? null : JSON.stringify(options.body)),
    pathParameters: {},
    queryStringParameters: options.query ?? {},
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    version: 'commonEvent',
  };
  const result = await handler(event, {} as Context);
  const headers = Object.fromEntries(
    Object.entries(result.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );
  const text = typeof result.body === 'string' ? result.body : '';
  return {
    status: result.statusCode ?? 200,
    headers,
    body: (text ? JSON.parse(text) : undefined) as T,
  };
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

/** Creates a uniquely named user with a known password and a valid access token. */
export async function createUser(role: UserRole, name?: string): Promise<TestUser> {
  const ds = await testDataSource();
  const suffix = randomUUID().slice(0, 8);
  const email = `${role.toLowerCase()}-${randomUUID()}@test.leaveflow.dev`;
  const displayName = name ?? `${role === 'REQUESTER' ? 'Requester' : 'Validator'} ${suffix}`;
  const id = await insertUserRow(ds, { role, email, name: displayName, passwordHash });
  const { tokens } = await getContainer();
  const { accessToken } = tokens.issue({ userId: id, role, name: displayName });
  return { id, name: displayName, email, role, token: accessToken };
}

export function submit(
  user: TestUser,
  startDate: string,
  endDate: string,
  extra: { reason?: string; key?: string } = {},
) {
  return call('POST', '/vacation-requests', {
    token: user.token,
    body: { startDate, endDate, ...(extra.reason !== undefined ? { reason: extra.reason } : {}) },
    headers: extra.key ? { 'idempotency-key': extra.key } : {},
  });
}

export async function eventsFor(
  aggregateId: string,
): Promise<Array<{ event_type: string; actor_id: string; payload: Record<string, unknown> }>> {
  const ds = await testDataSource();
  return ds.query(
    `SELECT event_type, actor_id, payload FROM domain_events WHERE aggregate_id = $1 ORDER BY seq`,
    [aggregateId],
  );
}

export async function requestRow(id: string): Promise<Record<string, unknown> | undefined> {
  const ds = await testDataSource();
  const [row] = (await ds.query(`SELECT * FROM vacation_requests WHERE id = $1`, [id])) as Array<
    Record<string, unknown>
  >;
  return row;
}
