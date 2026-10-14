import type { ErrorCode, FieldError } from '@leaveflow/contracts';

/**
 * Base class for every expected failure. Each subclass carries a stable `code` from the contracts
 * error table; the HTTP layer maps it to a status and a Problem Details body. Anything that is not
 * an ApplicationError is treated as unexpected (500, details logged, never returned).
 */
export abstract class ApplicationError extends Error {
  abstract readonly code: ErrorCode;
  /** Extra, client-safe fields merged into the Problem Details body. */
  readonly extensions: Record<string, unknown>;

  protected constructor(message: string, extensions: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.extensions = extensions;
  }
}

export class MalformedJsonError extends ApplicationError {
  readonly code = 'MALFORMED_JSON';
  constructor() {
    super('The request body is not valid JSON.');
  }
}

export class ValidationFailedError extends ApplicationError {
  readonly code = 'VALIDATION_FAILED';
  constructor(readonly errors: FieldError[]) {
    super('The request contains invalid fields.', { errors });
  }
}

export class UnauthenticatedError extends ApplicationError {
  readonly code = 'UNAUTHENTICATED';
  constructor(message = 'Authentication is required.') {
    super(message);
  }
}

export class ForbiddenError extends ApplicationError {
  readonly code = 'FORBIDDEN';
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
  }
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  constructor(resource: string) {
    super(`${resource} was not found.`);
  }
}

export class RouteNotFoundError extends ApplicationError {
  readonly code = 'ROUTE_NOT_FOUND';
  constructor(method: string, path: string) {
    super(`No route for ${method} ${path}.`);
  }
}
