import type { UserRepository } from './application/user-repository';
import { UsersService } from './application/users.service';

export function createUsersModule(users: UserRepository): UsersService {
  return new UsersService(users);
}
