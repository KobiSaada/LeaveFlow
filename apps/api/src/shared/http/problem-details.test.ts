import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ForbiddenError,
  MalformedJsonError,
  ValidationFailedError,
} from '../errors/application-errors';
import { toProblem } from './problem-details';

describe('toProblem', () => {
  it('maps application errors to their status and stable code', () => {
    expect(toProblem(new MalformedJsonError(), 'r1')).toMatchObject({
      status: 400,
      unexpected: false,
      body: { code: 'MALFORMED_JSON', requestId: 'r1' },
    });
    expect(toProblem(new ForbiddenError(), 'r1')).toMatchObject({
      status: 403,
      body: { code: 'FORBIDDEN' },
    });
  });

  it('carries field errors for validation failures', () => {
    const problem = toProblem(
      new ValidationFailedError([{ field: 'startDate', message: 'Required' }]),
      'r1',
    );
    expect(problem.status).toBe(422);
    expect(problem.body.errors).toEqual([{ field: 'startDate', message: 'Required' }]);
  });

  it('maps a stray ZodError to a 422 rather than a 500', () => {
    const error = z.object({ a: z.string() }).safeParse({}).error;
    expect(toProblem(error, 'r1')).toMatchObject({
      status: 422,
      body: { code: 'VALIDATION_FAILED', errors: [{ field: 'a' }] },
    });
  });

  it('hides everything about unexpected errors', () => {
    const problem = toProblem(
      new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'),
      'r1',
    );
    expect(problem).toMatchObject({
      status: 500,
      unexpected: true,
      body: { code: 'INTERNAL_ERROR' },
    });
    expect(JSON.stringify(problem.body)).not.toMatch(/ECONNREFUSED|hunter2|stack/);
  });
});
