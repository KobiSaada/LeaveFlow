import { registerAuthModule } from '../modules/auth/auth.module';
import { registerNotificationSubscribers } from '../modules/notifications/notification.subscriber';
import { registerUsersModule } from '../modules/users/users.module';
import { registerVacationRequestsModule } from '../modules/vacation-requests/vacation-requests.module';
import type { Container } from './container';

/** Each module registers its command/query handlers and event subscribers. */
export function registerModules(container: Container): void {
  registerAuthModule(container);
  registerUsersModule(container);
  registerVacationRequestsModule(container);
  registerNotificationSubscribers(container.eventBus);
}
