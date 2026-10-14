import type { LoginResponse, PublicUser } from '@leaveflow/contracts';
import type { TokenIssuer } from '../../../shared/application/principal';
import { ApplicationError, UnauthenticatedError } from '../../../shared/domain/errors';
import type { UserRepository } from '../../users/application/user-repository';
import type { PasswordHasher } from './password-hasher';

export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid email or password.');
  }
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  /** Exchanges credentials for an access token. */
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findCredentialsByEmail(email);
    if (!user) {
      // Same cost and same error as a wrong password: no account enumeration by message or timing.
      await this.passwords.verifyAgainstDummy(password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.passwords.verify(password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }
    const { passwordHash: _omit, ...publicUser } = user;
    const { accessToken, expiresIn } = this.tokens.issue({
      userId: user.id,
      role: user.role,
      name: user.name,
    });
    return { accessToken, tokenType: 'Bearer', expiresIn, user: publicUser };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    // A valid token for a user that no longer exists is not a session.
    if (!user) throw new UnauthenticatedError();
    return user;
  }
}
