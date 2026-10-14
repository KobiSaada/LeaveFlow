import type { CoreContainer } from '../../bootstrap/container';
import { UsersService } from './application/users.service';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user-repository';

export function createUsersModule({ dataSource }: CoreContainer): UsersService {
  return new UsersService(new TypeOrmUserRepository(dataSource));
}
