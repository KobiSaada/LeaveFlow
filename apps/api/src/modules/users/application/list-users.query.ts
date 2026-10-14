import type { PublicUser, UserRole } from '@leaveflow/contracts';
import { type MessageHandler, Query } from '../../../shared/application/bus';
import type { UserRepository } from './user-repository';

export const USERS_LIST_LIMIT = 500;

export class ListUsersQuery extends Query<PublicUser[]> {
  static readonly type = 'ListUsersQuery';
  readonly type = ListUsersQuery.type;
  constructor(readonly role?: UserRole) {
    super();
  }
}

export class ListUsersHandler implements MessageHandler<ListUsersQuery> {
  constructor(private readonly users: UserRepository) {}

  handle(query: ListUsersQuery): Promise<PublicUser[]> {
    return this.users.list({ role: query.role, limit: USERS_LIST_LIMIT });
  }
}
