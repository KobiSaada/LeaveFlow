import { QueryFailedError } from 'typeorm';

export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
} as const;

export type PgErrorCode = (typeof PG_ERROR)[keyof typeof PG_ERROR];

/**
 * Failures that say "retry the whole transaction", not "your request is wrong". Concurrent inserts
 * that conflict on an exclusion constraint can deadlock with each other (each waits for the other's
 * index entry); PostgreSQL aborts one of them with 40P01.
 */
export function isTransientTransactionError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const code = (error.driverError as { code?: string } | undefined)?.code;
  return code === PG_ERROR.DEADLOCK_DETECTED || code === PG_ERROR.SERIALIZATION_FAILURE;
}

export interface PgConstraintViolation {
  code: PgErrorCode;
  constraint: string | undefined;
}

/** Extracts a PostgreSQL constraint violation from a TypeORM error, or `null` for anything else. */
export function asConstraintViolation(error: unknown): PgConstraintViolation | null {
  if (!(error instanceof QueryFailedError)) return null;
  const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
  const code = driverError?.code;
  if (
    code === PG_ERROR.UNIQUE_VIOLATION ||
    code === PG_ERROR.CHECK_VIOLATION ||
    code === PG_ERROR.EXCLUSION_VIOLATION
  ) {
    return { code, constraint: driverError?.constraint };
  }
  return null;
}
