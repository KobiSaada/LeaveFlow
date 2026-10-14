import type { CoreContainer } from '../../bootstrap/container';
import { TypeOrmUserRepository } from '../users/infrastructure/typeorm-user-repository';
import { AuthService } from './application/auth.service';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';

export function createAuthModule({ dataSource, tokens }: CoreContainer): AuthService {
  return new AuthService(new TypeOrmUserRepository(dataSource), new BcryptPasswordHasher(), tokens);
}
