import { ERROR_HTTP_STATUS, type ErrorCode, type ProblemDetails } from '@leaveflow/contracts';
import { ZodError } from 'zod';
import { ApplicationError } from '../domain/errors';
import { zodIssuesToFieldErrors } from './request';

const TITLES: Partial<Record<ErrorCode, string>> = {
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

function problemType(code: ErrorCode): string {
  return `urn:leaveflow:problem:${code.toLowerCase().replace(/_/g, '-')}`;
}

export interface MappedProblem {
  status: number;
  body: ProblemDetails;
  /** True when the error was not anticipated and must be logged with its stack. */
  unexpected: boolean;
}

/**
 * Maps any thrown value to a Problem Details body. Expected failures keep their message and
 * client-safe extensions; anything else becomes a generic 500 that reveals nothing internal.
 */
export function toProblem(error: unknown, requestId: string): MappedProblem {
  if (error instanceof ApplicationError) {
    const status = ERROR_HTTP_STATUS[error.code];
    return {
      status,
      unexpected: false,
      body: {
        ...error.extensions,
        type: problemType(error.code),
        title: error.message,
        status,
        code: error.code,
        requestId,
      },
    };
  }
  if (error instanceof ZodError) {
    return {
      status: ERROR_HTTP_STATUS.VALIDATION_FAILED,
      unexpected: false,
      body: {
        type: problemType('VALIDATION_FAILED'),
        title: 'The request contains invalid fields.',
        status: ERROR_HTTP_STATUS.VALIDATION_FAILED,
        code: 'VALIDATION_FAILED',
        errors: zodIssuesToFieldErrors(error),
        requestId,
      },
    };
  }
  return {
    status: ERROR_HTTP_STATUS.INTERNAL_ERROR,
    unexpected: true,
    body: {
      type: problemType('INTERNAL_ERROR'),
      title: TITLES.INTERNAL_ERROR ?? 'Internal error',
      status: ERROR_HTTP_STATUS.INTERNAL_ERROR,
      code: 'INTERNAL_ERROR',
      requestId,
    },
  };
}
