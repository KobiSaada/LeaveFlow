import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { UnauthenticatedError } from '../../../shared/errors/application-errors';
import { JwtTokenService } from './jwt-token-service';

const settings = {
  secret: 's'.repeat(32),
  issuer: 'leaveflow-api',
  audience: 'leaveflow-web',
  ttlSeconds: 60,
};
const principal = {
  userId: '6f1c1b2e-2f43-4d0a-9a51-0f8a2f6c1c11',
  role: 'VALIDATOR' as const,
  name: 'Dana Mizrahi',
};

describe('JwtTokenService', () => {
  const service = new JwtTokenService(settings);

  it('round-trips a principal', () => {
    const { accessToken, expiresIn } = service.issue(principal);
    expect(expiresIn).toBe(60);
    expect(service.verify(accessToken)).toEqual(principal);
  });

  it.each([
    [
      'another secret',
      () =>
        new JwtTokenService({ ...settings, secret: 'x'.repeat(32) }).issue(principal).accessToken,
    ],
    [
      'another audience',
      () => new JwtTokenService({ ...settings, audience: 'evil' }).issue(principal).accessToken,
    ],
    [
      'another issuer',
      () => new JwtTokenService({ ...settings, issuer: 'evil' }).issue(principal).accessToken,
    ],
    [
      'an expired token',
      () =>
        jwt.sign({ role: 'VALIDATOR', name: 'x' }, settings.secret, {
          subject: principal.userId,
          issuer: settings.issuer,
          audience: settings.audience,
          expiresIn: -10,
        }),
    ],
    [
      'alg "none"',
      () =>
        jwt.sign(
          {
            role: 'VALIDATOR',
            name: 'x',
            sub: principal.userId,
            iss: settings.issuer,
            aud: settings.audience,
          },
          '',
          { algorithm: 'none' },
        ),
    ],
    [
      'HS512 with the right secret',
      () =>
        jwt.sign({ role: 'VALIDATOR', name: 'x' }, settings.secret, {
          algorithm: 'HS512',
          subject: principal.userId,
          issuer: settings.issuer,
          audience: settings.audience,
        }),
    ],
    [
      'an unknown role claim',
      () =>
        jwt.sign({ role: 'ADMIN', name: 'x' }, settings.secret, {
          subject: principal.userId,
          issuer: settings.issuer,
          audience: settings.audience,
        }),
    ],
    ['garbage', () => 'not.a.token'],
  ])('rejects %s', (_label, makeToken) => {
    expect(() => service.verify(makeToken())).toThrow(UnauthenticatedError);
  });
});
