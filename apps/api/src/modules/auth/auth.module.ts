import type { Container } from '../../bootstrap/container';
import { TypeOrmUserRepository } from '../users/infrastructure/typeorm-user-repository';
import { GetMeHandler, GetMeQuery } from './application/get-me.query';
import { LoginHandler, LoginQuery } from './application/login.query';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';

export function registerAuthModule(container: Container): void {
  const users = new TypeOrmUserRepository(container.dataSource);
  container.queryBus.register<LoginQuery>(
    LoginQuery.type,
    new LoginHandler(users, new BcryptPasswordHasher(), container.tokens),
  );
  container.queryBus.register<GetMeQuery>(GetMeQuery.type, new GetMeHandler(users));
}
