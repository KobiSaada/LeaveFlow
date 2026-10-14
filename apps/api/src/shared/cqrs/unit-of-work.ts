import type { DomainEvent } from '../domain/domain-event';

/**
 * An open transaction. Repositories receive it explicitly so the application layer stays free of
 * ORM types; the infrastructure implementation unwraps it.
 */
export interface Transaction {
  /** Queues events to be persisted in this transaction and published after it commits. */
  recordEvents(events: readonly DomainEvent[]): void;
}

export interface UnitOfWork {
  /**
   * Runs `work` in one database transaction. Recorded events are written to the event store in the
   * same transaction and published on the event bus only after a successful commit.
   */
  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}
