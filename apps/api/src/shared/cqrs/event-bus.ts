import type { DomainEvent } from '../domain/domain-event';

type EventSubscriber<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

interface EventBusErrorReporter {
  (error: unknown, event: DomainEvent, subscriberName: string): void;
}

/**
 * In-process event bus. Publishing happens only after the transaction that recorded the events
 * has committed (see UnitOfWork). A failing subscriber is reported and never propagates: side
 * effects must not undo or fail a state change that is already durable.
 *
 * In production this port could be backed by SQS — CEF already routes SQS events to handlers.
 */
export class EventBus {
  private readonly subscribers = new Map<string, Array<{ name: string; fn: EventSubscriber }>>();

  constructor(private readonly reportError: EventBusErrorReporter) {}

  subscribe<E extends DomainEvent>(
    eventType: E['eventType'],
    name: string,
    fn: EventSubscriber<E>,
  ): void {
    const list = this.subscribers.get(eventType) ?? [];
    list.push({ name, fn: fn as EventSubscriber });
    this.subscribers.set(eventType, list);
  }

  async publish(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const { name, fn } of this.subscribers.get(event.eventType) ?? []) {
        try {
          await fn(event);
        } catch (error) {
          this.reportError(error, event, name);
        }
      }
    }
  }
}
