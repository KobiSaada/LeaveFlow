import type { DomainEvent } from './domain-event';

/** Records domain events raised by state changes until the unit of work collects them. */
export abstract class AggregateRoot {
  private pendingEvents: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.pendingEvents.push(event);
  }

  /** Returns and clears the events recorded since the last call. */
  pullEvents(): DomainEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }
}
