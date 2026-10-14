import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDataSource } from '../../src/shared/database/data-source';
import { call, createUser, TEST_PASSWORD, type TestUser, useFixedClock } from '../support/api';

let alice: TestUser;
let dana: TestUser;

beforeAll(async () => {
  useFixedClock();
  alice = await createUser('REQUESTER', 'Alice Integration');
  dana = await createUser('VALIDATOR');
});
afterAll(() => closeDataSource());

describe('POST /auth/login (AC-1)', () => {
  it('returns a bearer token and the public profile', async () => {
    const res = await call('POST', '/auth/login', {
      body: { email: alice.email.toUpperCase(), password: TEST_PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 28800,
      user: { id: alice.id, email: alice.email, role: 'REQUESTER', name: 'Alice Integration' },
    });
    expect(jwt.decode(res.body.accessToken)).toMatchObject({
      sub: alice.id,
      role: 'REQUESTER',
      iss: 'leaveflow-api',
      aud: 'leaveflow-web',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('answers a wrong password and an unknown email identically', async () => {
    const wrong = await call('POST', '/auth/login', {
      body: { email: alice.email, password: 'nope' },
    });
    const unknown = await call('POST', '/auth/login', {
      body: { email: 'ghost@test.leaveflow.dev', password: 'nope' },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    const strip = ({ requestId: _r, ...rest }: Record<string, unknown>) => rest;
    expect(strip(wrong.body)).toEqual(strip(unknown.body));
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the payload (422) and rejects malformed JSON (400)', async () => {
    expect(
      (await call('POST', '/auth/login', { body: { email: 'not-an-email' } })).body,
    ).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect((await call('POST', '/auth/login', { rawBody: '{"email":' })).body).toMatchObject({
      status: 400,
      code: 'MALFORMED_JSON',
    });
  });
});

describe('authentication on protected routes (AC-2)', () => {
  it('serves /auth/me for a valid token', async () => {
    const res = await call('GET', '/auth/me', { token: dana.token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: dana.id,
      name: dana.name,
      email: dana.email,
      role: 'VALIDATOR',
    });
  });

  const claims = { role: 'REQUESTER', name: 'x' };
  const opts = (overrides: jwt.SignOptions = {}) => ({
    issuer: 'leaveflow-api',
    audience: 'leaveflow-web',
    expiresIn: 60,
    ...overrides,
  });

  it.each([
    ['no token', undefined],
    [
      'an expired token',
      () =>
        jwt.sign(claims, process.env.JWT_SECRET!, {
          ...opts({ expiresIn: -5 }),
          subject: alice.id,
        }),
    ],
    [
      'a token signed with another secret',
      () => jwt.sign(claims, 'another-secret-another-secret-123', { ...opts(), subject: alice.id }),
    ],
    [
      'a token for another audience',
      () =>
        jwt.sign(claims, process.env.JWT_SECRET!, {
          ...opts({ audience: 'other' }),
          subject: alice.id,
        }),
    ],
    ['a malformed token', () => 'abc.def.ghi'],
  ])('rejects %s with 401', async (_label, makeToken) => {
    const res = await call('GET', '/auth/me', {
      token: typeof makeToken === 'function' ? makeToken() : undefined,
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});
