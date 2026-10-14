import { createAuthModule } from '../modules/auth/auth.module';
import { createNotificationsModule } from '../modules/notifications/notifications.module';
import { createUsersModule } from '../modules/users/users.module';
import { TypeOrmUserRepository } from '../modules/users/repositories/typeorm-user.repository';
import { createVacationRequestsModule } from '../modules/vacation-requests/vacation-requests.module';
import type { AppServices, CoreContainer } from './container';

/**
 * Wires every module: registers command handlers and event subscribers, and returns the read
 * services. Shared collaborators (the user repository) are created once and passed in.
 */
export function createModules(core: CoreContainer): AppServices {
  const users = new TypeOrmUserRepository(core.dataSource);
  createNotificationsModule(core);
  return {
    auth: createAuthModule(core, users),
    users: createUsersModule(users),
    vacationRequests: createVacationRequestsModule(core, users),
  };
}
