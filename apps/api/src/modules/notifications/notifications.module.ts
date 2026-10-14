import type { CoreContainer } from '../../bootstrap/container';
import { registerNotificationSubscribers } from './subscribers/notification.subscriber';

/** Notifications have no endpoints: the module only subscribes to domain events. */
export function createNotificationsModule({ eventBus }: CoreContainer): void {
  registerNotificationSubscribers(eventBus);
}
