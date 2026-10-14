import type { Container } from '../../bootstrap/container';
import { ListUsersHandler, ListUsersQuery } from './application/list-users.query';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user-repository';

export function registerUsersModule(container: Container): void {
  container.queryBus.register<ListUsersQuery>(
    ListUsersQuery.type,
    new ListUsersHandler(new TypeOrmUserRepository(container.dataSource)),
  );
}
