import type { DataSource, EntityManager } from 'typeorm';
import type { EventBus } from '../cqrs/event-bus';
import type { Transaction, UnitOfWork } from '../cqrs/unit-of-work';
import type { DomainEvent } from '../domain/domain-event';
import { DomainEventEntity } from './domain-event.entity';

class TypeOrmTransaction implements Transaction {
  readonly events: DomainEvent[] = [];

  constructor(readonly manager: EntityManager) {}

  recordEvents(events: readonly DomainEvent[]): void {
    this.events.push(...events);
  }
}

/** Unwraps the ORM transaction for infrastructure code (repositories). */
export function entityManagerOf(tx: Transaction): EntityManager {
  if (!(tx instanceof TypeOrmTransaction)) {
    throw new TypeError('Expected a TypeORM transaction');
  }
  return tx.manager;
}

function toRow(event: DomainEvent): DomainEventEntity {
  const row = new DomainEventEntity();
  row.id = event.eventId;
  row.aggregateType = event.aggregateType;
  row.aggregateId = event.aggregateId;
  row.eventType = event.eventType;
  row.payload = { ...event.payload };
  row.actorId = event.actorId;
  row.occurredAt = event.occurredAt;
  return row;
}

/**
 * Outbox-lite: events are inserted into `domain_events` inside the business transaction (so a
 * rolled-back change leaves no event and a committed change always has its event) and published to
 * in-process subscribers only after commit (so subscribers never observe uncommitted state).
 */
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
  ) {}

  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    let committedEvents: DomainEvent[] = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const tx = new TypeOrmTransaction(manager);
      const value = await work(tx);
      if (tx.events.length > 0) {
        await manager.insert(DomainEventEntity, tx.events.map(toRow));
      }
      committedEvents = tx.events;
      return value;
    });
    // Events are published only after COMMIT.
    await this.eventBus.publish(committedEvents);
    return result;
  }
}
