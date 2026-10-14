import type { VacationRequestStatus } from '@leaveflow/contracts';
import type { ApiError } from '@/shared/api/http';
import { formatVacation } from './dates';

/** User-facing copy for API errors (epic §9.3). */
export function describeError(error: ApiError): string {
  const problem = error.problem as Record<string, unknown> | undefined;
  switch (error.code) {
    case 'VACATION_OVERLAP': {
      const range = problem?.conflictingRange as { startDate: string; endDate: string } | undefined;
      return range
        ? `These dates overlap another active request of yours (${formatVacation(range.startDate, range.endDate)}).`
        : 'These dates overlap another active request of yours.';
    }
    case 'REQUEST_NOT_PENDING': {
      const status =
        (problem?.currentStatus as VacationRequestStatus | undefined)?.toLowerCase() ?? 'decided';
      const decider = (problem?.decidedBy as { name: string } | null | undefined)?.name;
      return decider
        ? `This request was already ${status} by ${decider}.`
        : `This request was already ${status}.`;
    }
    case 'START_DATE_IN_PAST':
      return "Start date can't be in the past.";
    case 'INVALID_DATE_RANGE':
      return 'End date must be after the start date.';
    case 'REJECTION_COMMENT_REQUIRED':
      return 'A comment is required to reject a request.';
    case 'INTERNAL_ERROR':
      return `Something went wrong. Please try again.${error.requestId ? ` (Reference: ${error.requestId})` : ''}`;
    default:
      return error.message;
  }
}
