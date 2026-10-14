import type { DataSource, EntityManager } from 'typeorm';
import type { EventBus } from '../../application/event-bus';
import type { Transaction, UnitOfWork } from '../../application/unit-of-work';
import type { DomainEvent } from '../../domain/domain-event';
import { DomainEventEntity } from '../events/domain-event.entity';
import { logger } from '../logger';
import { isTransientTransactionError } from './pg-errors';

const MAX_ATTEMPTS = 3;

export class TypeOrmTransaction implements Transaction {
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

  /**
   * `work` may run more than once: a deadlock or serialization failure (typical when concurrent
   * requests collide on the overlap constraint) rolls the attempt back and retries it from scratch,
   * so the retry re-reads state and can answer with the proper domain error or idempotent replay.
   */
  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.runOnce(work);
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS || !isTransientTransactionError(error)) throw error;
        logger().warn({ attempt, err: error }, 'transient transaction failure — retrying');
        await new Promise((resolve) => setTimeout(resolve, 10 * attempt + Math.random() * 20));
      }
    }
  }

  private async runOnce<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
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
    // Only the committed attempt's events are published, and only after COMMIT.
    await this.eventBus.publish(committedEvents);
    return result;
  }
}
