import type { CoreContainer } from '../../bootstrap/container';
import type { UserRepository } from '../users/repositories/user.repository';
import { AuthService } from './services/auth.service';
import { BcryptPasswordHasher } from './services/bcrypt-password-hasher';

export function createAuthModule({ tokens }: CoreContainer, users: UserRepository): AuthService {
  return new AuthService(users, new BcryptPasswordHasher(), tokens);
}
