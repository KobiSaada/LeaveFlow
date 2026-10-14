import { createAuthModule } from '../modules/auth/auth.module';
import { registerNotificationSubscribers } from '../modules/notifications/notification.subscriber';
import { createUsersModule } from '../modules/users/users.module';
import { createVacationRequestsModule } from '../modules/vacation-requests/vacation-requests.module';
import type { AppServices, CoreContainer } from './container';

/** Each module registers its command handlers / subscribers and returns its read service. */
export function registerModules(core: CoreContainer): AppServices {
  registerNotificationSubscribers(core.eventBus);
  return {
    auth: createAuthModule(core),
    users: createUsersModule(core),
    vacationRequests: createVacationRequestsModule(core),
  };
}
