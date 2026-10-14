import type { EventBus } from '../../shared/application/event-bus';
import { logger } from '../../shared/infrastructure/logger';
import type {
  VacationRequestApproved,
  VacationRequestCreated,
  VacationRequestRejected,
} from '../vacation-requests/domain/vacation-request.events';

/**
 * Stand-in for email/chat notifications. It shows the decoupling the events buy: the commands do
 * not know this exists. Swapping the body for an email or SQS publisher needs no other change.
 */
export function registerNotificationSubscribers(eventBus: EventBus): void {
  const notify = (
    recipient: 'validators' | 'requester',
    template: string,
    event: { eventId: string; aggregateId: string; payload: { userId: string } },
  ) =>
    logger().info(
      {
        channel: 'log',
        template,
        recipient,
        requesterId: event.payload.userId,
        vacationRequestId: event.aggregateId,
        eventId: event.eventId,
      },
      'notification dispatched',
    );

  eventBus.subscribe<VacationRequestCreated>(
    'VacationRequestCreated',
    'notify-validators-of-new-request',
    (event) => notify('validators', 'vacation-request-submitted', event),
  );
  eventBus.subscribe<VacationRequestApproved>(
    'VacationRequestApproved',
    'notify-requester-of-approval',
    (event) => notify('requester', 'vacation-request-approved', event),
  );
  eventBus.subscribe<VacationRequestRejected>(
    'VacationRequestRejected',
    'notify-requester-of-rejection',
    (event) => notify('requester', 'vacation-request-rejected', event),
  );
}
