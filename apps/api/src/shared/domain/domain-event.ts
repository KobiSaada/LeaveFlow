/** A fact that happened, named in the past tense. Immutable once recorded. */
/** Flat scalar payload; free text (reason, comments) never goes into events. */
export type EventPayload = Record<string, string | number | boolean | null>;

export interface DomainEvent<
  TType extends string = string,
  TPayload extends EventPayload = EventPayload,
> {
  readonly eventId: string;
  readonly eventType: TType;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly actorId: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
