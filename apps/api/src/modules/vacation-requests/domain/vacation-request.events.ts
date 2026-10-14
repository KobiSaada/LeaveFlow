import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '../../../shared/domain/domain-event';

export const VACATION_REQUEST_AGGREGATE = 'VacationRequest';

// Payloads hold identifiers and dates only — never reason or comment text (free-text PII).
export type VacationRequestCreated = DomainEvent<
  'VacationRequestCreated',
  { userId: string; startDate: string; endDate: string }
>;
export type VacationRequestApproved = DomainEvent<
  'VacationRequestApproved',
  { userId: string; decidedBy: string; startDate: string; endDate: string }
>;
export type VacationRequestRejected = DomainEvent<
  'VacationRequestRejected',
  { userId: string; decidedBy: string }
>;

export type VacationRequestEvent =
  VacationRequestCreated | VacationRequestApproved | VacationRequestRejected;

export function vacationRequestEvent<E extends VacationRequestEvent>(
  eventType: E['eventType'],
  aggregateId: string,
  actorId: string,
  occurredAt: Date,
  payload: E['payload'],
): E {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateType: VACATION_REQUEST_AGGREGATE,
    aggregateId,
    actorId,
    occurredAt,
    payload,
  } as E;
}
