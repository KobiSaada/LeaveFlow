import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent';
import { describe, expect, it } from 'vitest';
import { MalformedJsonError } from '../domain/errors';
import { EndpointRequest } from './request';

const make = (overrides: Partial<CommonEvent>): EndpointRequest =>
  new EndpointRequest({
    path: '/x',
    method: 'GET',
    body: null,
    pathParameters: {},
    queryStringParameters: {},
    headers: {},
    version: 'commonEvent',
    ...overrides,
  });

describe('EndpointRequest', () => {
  it('URL-decodes query values that CEF passes through raw', () => {
    const request = make({
      queryStringParameters: { status: 'PENDING', q: 'a%20b%2Bc', name: 'Bob+Levi', empty: '' },
    });
    expect(request.query()).toEqual({ status: 'PENDING', q: 'a b+c', name: 'Bob Levi' });
  });

  it('looks headers up case-insensitively', () => {
    expect(make({ headers: { Authorization: 'Bearer x' } }).header('authorization')).toBe(
      'Bearer x',
    );
    expect(make({ headers: { 'idempotency-key': 'k' } }).header('Idempotency-Key')).toBe('k');
  });

  it('parses JSON bodies, treats an empty body as undefined, and rejects invalid JSON', () => {
    expect(make({ body: '{"a":1}' }).body()).toEqual({ a: 1 });
    expect(make({ body: '' }).body()).toBeUndefined();
    expect(() => make({ body: '{"a":' }).body()).toThrow(MalformedJsonError);
  });

  it('decodes base64-encoded bodies (API Gateway binary passthrough)', () => {
    const body = Buffer.from('{"a":2}').toString('base64');
    expect(make({ body, isBase64Encoded: true }).body()).toEqual({ a: 2 });
  });
});
