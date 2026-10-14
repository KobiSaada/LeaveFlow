import type { CoreContainer } from '../../bootstrap/container';
import type { UserRepository } from '../users/application/user-repository';
import { AuthService } from './application/auth.service';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';

export function createAuthModule({ tokens }: CoreContainer, users: UserRepository): AuthService {
  return new AuthService(users, new BcryptPasswordHasher(), tokens);
}
