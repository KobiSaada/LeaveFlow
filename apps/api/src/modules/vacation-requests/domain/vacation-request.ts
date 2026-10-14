import { compareIsoDates, type IsoDate, type VacationRequestStatus } from '@leaveflow/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { type DateRange } from './date-range';
import {
  RejectionCommentRequiredError,
  RequestNotPendingError,
  StartDateInPastError,
} from './vacation-request.errors';
import {
  type VacationRequestApproved,
  type VacationRequestCreated,
  vacationRequestEvent,
  type VacationRequestRejected,
} from './vacation-request.events';

export type Decision = 'APPROVED' | 'REJECTED';

/** Result of a decision: `unchanged` means the request already had that decision (idempotent). */
type DecisionOutcome = 'decided' | 'unchanged';

interface VacationRequestState {
  id: string;
  userId: string;
  range: DateRange;
  reason: string | null;
  status: VacationRequestStatus;
  comments: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  idempotencyKey: string | null;
}

interface SubmitVacationRequest {
  id: string;
  requesterId: string;
  range: DateRange;
  reason: string | null;
  idempotencyKey: string | null;
  today: IsoDate;
  now: Date;
}

/**
 * Aggregate root. Enforces the rules that need only the request itself:
 * BR-4 no past start (at submission), BR-3 terminal statuses, BR-5 rejection needs a comment.
 * BR-1 is enforced by DateRange; BR-2 (overlap) needs other requests and lives in the handler,
 * backed by a database exclusion constraint.
 */
export class VacationRequest extends AggregateRoot {
  private constructor(private state: VacationRequestState) {
    super();
  }

  static submit(input: SubmitVacationRequest): VacationRequest {
    if (compareIsoDates(input.range.start, input.today) < 0) {
      throw new StartDateInPastError(input.range.start, input.today);
    }
    const request = new VacationRequest({
      id: input.id,
      userId: input.requesterId,
      range: input.range,
      reason: input.reason,
      status: 'PENDING',
      comments: null,
      decidedBy: null,
      decidedAt: null,
      idempotencyKey: input.idempotencyKey,
    });
    request.record(
      vacationRequestEvent<VacationRequestCreated>(
        'VacationRequestCreated',
        input.id,
        input.requesterId,
        input.now,
        {
          userId: input.requesterId,
          startDate: input.range.start,
          endDate: input.range.end,
        },
      ),
    );
    return request;
  }

  static rehydrate(state: VacationRequestState): VacationRequest {
    return new VacationRequest({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get userId(): string {
    return this.state.userId;
  }

  get range(): DateRange {
    return this.state.range;
  }

  get status(): VacationRequestStatus {
    return this.state.status;
  }

  get decidedBy(): string | null {
    return this.state.decidedBy;
  }

  snapshot(): Readonly<VacationRequestState> {
    return { ...this.state };
  }

  /** Whether a retried submission carries the same payload as this request (idempotent replay). */
  hasSamePayload(range: DateRange, reason: string | null): boolean {
    return this.state.range.equals(range) && this.state.reason === reason;
  }

  decide(
    decision: Decision,
    validatorId: string,
    comment: string | null,
    now: Date,
  ): DecisionOutcome {
    if (decision === 'REJECTED' && !comment?.trim()) throw new RejectionCommentRequiredError();
    if (this.state.status === decision) return 'unchanged';
    if (this.state.status !== 'PENDING') {
      throw new RequestNotPendingError(this.state.status, null);
    }

    this.state = {
      ...this.state,
      status: decision,
      comments: comment?.trim() || null,
      decidedBy: validatorId,
      decidedAt: now,
    };
    const { id, userId, range } = this.state;
    if (decision === 'APPROVED') {
      this.record(
        vacationRequestEvent<VacationRequestApproved>(
          'VacationRequestApproved',
          id,
          validatorId,
          now,
          {
            userId,
            decidedBy: validatorId,
            startDate: range.start,
            endDate: range.end,
          },
        ),
      );
    } else {
      this.record(
        vacationRequestEvent<VacationRequestRejected>(
          'VacationRequestRejected',
          id,
          validatorId,
          now,
          {
            userId,
            decidedBy: validatorId,
          },
        ),
      );
    }
    return 'decided';
  }
}
