import type { IsoDate, UserRef, VacationRequestStatus } from '@leaveflow/contracts';
import { ApplicationError, NotFoundError } from '../../../shared/domain/errors';

export class InvalidDateRangeError extends ApplicationError {
  readonly code = 'INVALID_DATE_RANGE';
  constructor(startDate: IsoDate, endDate: IsoDate) {
    super('The end date must be after the start date.', { startDate, endDate });
  }
}

export class StartDateInPastError extends ApplicationError {
  readonly code = 'START_DATE_IN_PAST';
  constructor(startDate: IsoDate, today: IsoDate) {
    super("The start date can't be in the past.", { startDate, today });
  }
}

export class VacationOverlapError extends ApplicationError {
  readonly code = 'VACATION_OVERLAP';
  /** `conflictingRange` is absent when the overlap was detected by the database during a race. */
  constructor(conflictingRange?: { id: string; startDate: IsoDate; endDate: IsoDate }) {
    super(
      'These dates overlap another active request of yours.',
      conflictingRange ? { conflictingRange } : {},
    );
  }
}

export class RequestNotPendingError extends ApplicationError {
  readonly code = 'REQUEST_NOT_PENDING';
  constructor(currentStatus: VacationRequestStatus, decidedBy: UserRef | null) {
    super(`This request was already ${currentStatus.toLowerCase()}.`, { currentStatus, decidedBy });
  }
}

export class RejectionCommentRequiredError extends ApplicationError {
  readonly code = 'REJECTION_COMMENT_REQUIRED';
  constructor() {
    super('A comment is required to reject a request.');
  }
}

export class IdempotencyKeyReusedError extends ApplicationError {
  readonly code = 'IDEMPOTENCY_KEY_REUSED';
  constructor() {
    super('This Idempotency-Key was already used for a different request.');
  }
}

export class VacationRequestNotFoundError extends NotFoundError {
  constructor() {
    super('Vacation request');
  }
}
