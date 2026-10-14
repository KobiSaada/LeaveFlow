export const USER_ROLES = ['REQUESTER', 'VALIDATOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VACATION_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type VacationRequestStatus = (typeof VACATION_REQUEST_STATUSES)[number];

/** Statuses that block overlapping requests and appear in team planning. */
export const ACTIVE_VACATION_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
] as const satisfies readonly VacationRequestStatus[];
