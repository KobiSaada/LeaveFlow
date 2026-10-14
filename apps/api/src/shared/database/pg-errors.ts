import { QueryFailedError } from 'typeorm';

export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
} as const;

type PgErrorCode = (typeof PG_ERROR)[keyof typeof PG_ERROR];

interface PgConstraintViolation {
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
