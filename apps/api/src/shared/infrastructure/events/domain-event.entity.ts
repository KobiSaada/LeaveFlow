import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { EventPayload } from '../../domain/domain-event';

/** Insert-only record of every domain event (outbox-lite + audit trail). */
@Entity({ name: 'domain_events' })
export class DomainEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'aggregate_type' })
  aggregateType: string;

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: EventPayload;

  @Column({ type: 'uuid', name: 'actor_id' })
  actorId: string;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;
}
