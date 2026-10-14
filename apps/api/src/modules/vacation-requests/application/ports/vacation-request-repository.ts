import type { Transaction } from '../../../../shared/application/unit-of-work';
import type { DateRange } from '../../domain/date-range';
import type { VacationRequest } from '../../domain/vacation-request';

/**
 * Raised by `insert` when the (user, idempotency key) unique index rejects a row — i.e. a concurrent
 * request with the same key won the race. The transaction is aborted; the caller retries the lookup.
 */
export class IdempotencyKeyRaceError extends Error {
  override readonly name = 'IdempotencyKeyRaceError';
}

export interface VacationRequestRepository {
  /**
   * Serialises writers of one user's schedule for the rest of the transaction. Without it,
   * concurrent conflicting inserts deadlock on the exclusion constraint instead of one of them
   * cleanly seeing the other's committed request.
   */
  lockScheduleOf(tx: Transaction, userId: string): Promise<void>;
  findById(tx: Transaction, id: string): Promise<VacationRequest | null>;
  findByIdempotencyKey(
    tx: Transaction,
    userId: string,
    key: string,
  ): Promise<VacationRequest | null>;
  /** First PENDING/APPROVED request of `userId` sharing at least one day with `range`. */
  findActiveOverlapping(
    tx: Transaction,
    userId: string,
    range: DateRange,
  ): Promise<VacationRequest | null>;
  /**
   * Inserts a new request. Throws VacationOverlapError when the exclusion constraint fires (a
   * concurrent insert won) and IdempotencyKeyRaceError on a duplicate idempotency key.
   */
  insert(tx: Transaction, request: VacationRequest): Promise<void>;
  /**
   * Persists a decision with compare-and-set semantics (`WHERE status = 'PENDING'`).
   * Returns false when the row was no longer pending — a concurrent decision committed first.
   */
  saveDecision(tx: Transaction, request: VacationRequest): Promise<boolean>;
}
