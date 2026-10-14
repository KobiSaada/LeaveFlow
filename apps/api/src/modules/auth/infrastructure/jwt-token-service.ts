import { USER_ROLES } from '@leaveflow/contracts';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Principal, TokenIssuer, TokenVerifier } from '../../../shared/application/principal';
import { UnauthenticatedError } from '../../../shared/domain/errors';

export interface JwtSettings {
  secret: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
}

const claimsSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(USER_ROLES),
  name: z.string().min(1),
});

/** HS256 access tokens. Verification pins the algorithm and checks issuer, audience and expiry. */
export class JwtTokenService implements TokenIssuer, TokenVerifier {
  constructor(private readonly settings: JwtSettings) {}

  issue(principal: Principal): { accessToken: string; expiresIn: number } {
    const accessToken = jwt.sign(
      { role: principal.role, name: principal.name },
      this.settings.secret,
      {
        algorithm: 'HS256',
        subject: principal.userId,
        issuer: this.settings.issuer,
        audience: this.settings.audience,
        expiresIn: this.settings.ttlSeconds,
      },
    );
    return { accessToken, expiresIn: this.settings.ttlSeconds };
  }

  verify(token: string): Principal {
    let payload: unknown;
    try {
      payload = jwt.verify(token, this.settings.secret, {
        algorithms: ['HS256'],
        issuer: this.settings.issuer,
        audience: this.settings.audience,
      });
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      throw new UnauthenticatedError(
        expired ? 'Your session has expired.' : 'The access token is invalid.',
      );
    }
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) throw new UnauthenticatedError('The access token is invalid.');
    return { userId: claims.data.sub, role: claims.data.role, name: claims.data.name };
  }
}
