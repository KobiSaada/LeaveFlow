/**
 * Stable, machine-readable error codes returned in Problem Details bodies (`code`).
 * The HTTP status for each code is fixed here so API and web agree on it.
 */
export const ERROR_HTTP_STATUS = {
  MALFORMED_JSON: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ROUTE_NOT_FOUND: 404,
  VACATION_OVERLAP: 409,
  REQUEST_NOT_PENDING: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  VALIDATION_FAILED: 422,
  INVALID_DATE_RANGE: 422,
  START_DATE_IN_PAST: 422,
  REJECTION_COMMENT_REQUIRED: 422,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export interface FieldError {
  field: string;
  message: string;
}

/** RFC 9457 Problem Details as emitted by the API (`application/problem+json`). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  errors?: FieldError[];
  requestId: string;
  [extension: string]: unknown;
}
