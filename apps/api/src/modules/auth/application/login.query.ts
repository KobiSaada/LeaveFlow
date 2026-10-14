import type { LoginResponse } from '@leaveflow/contracts';
import { type MessageHandler, Query } from '../../../shared/application/bus';
import type { TokenIssuer } from '../../../shared/application/principal';
import { ApplicationError } from '../../../shared/domain/errors';
import type { UserRepository } from '../../users/application/user-repository';
import type { PasswordHasher } from './password-hasher';

export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid email or password.');
  }
}

/** Exchanges credentials for an access token. Reads state only, hence a query. */
export class LoginQuery extends Query<LoginResponse> {
  static readonly type = 'LoginQuery';
  readonly type = LoginQuery.type;
  constructor(
    readonly email: string,
    readonly password: string,
  ) {
    super();
  }
}

export class LoginHandler implements MessageHandler<LoginQuery> {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  async handle({ email, password }: LoginQuery): Promise<LoginResponse> {
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
}
