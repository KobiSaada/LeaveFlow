import type { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/users.service';

export function createUsersModule(users: UserRepository): UsersService {
  return new UsersService(users);
}
