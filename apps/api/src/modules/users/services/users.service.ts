import type { PublicUser, UserRole } from '@leaveflow/contracts';
import type { UserRepository } from '../repositories/user.repository';

const USERS_LIST_LIMIT = 500;

export class UsersService {
  constructor(private readonly users: UserRepository) {}

  /** Users ordered by name — feeds the validator dashboard's employee filter. */
  list(role?: UserRole): Promise<PublicUser[]> {
    return this.users.list({ role, limit: USERS_LIST_LIMIT });
  }
}
