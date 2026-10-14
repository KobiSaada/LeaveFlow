import type { FieldError } from '@leaveflow/contracts';
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent';
import type { ZodError, ZodType, ZodTypeDef } from 'zod';
import { MalformedJsonError, ValidationFailedError } from '../domain/errors';

type Location = 'body' | 'query' | 'path' | 'header';

/** Field names mirror request property names so clients can attach errors to form fields. */
export function zodIssuesToFieldErrors(error: ZodError, location: Location = 'body'): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : location,
    message: issue.message,
  }));
}

function decode(value: string): string {
  try {
    // CEF's dev server passes query values through undecoded; '+' means space in query strings.
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Read-only view over a CEF CommonEvent with the parsing every endpoint needs. */
export class EndpointRequest {
  constructor(readonly event: CommonEvent) {}

  /** Parsed JSON body; an absent/empty body is `undefined`, invalid JSON is a 400. */
  body(): unknown {
    const raw = this.event.body;
    if (raw === null || raw === undefined || raw === '') return undefined;
    const text = this.event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new MalformedJsonError();
    }
  }

  query(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.event.queryStringParameters ?? {})) {
      if (value !== undefined && value !== '') result[decode(key)] = decode(value);
    }
    return result;
  }

  pathParam(name: string): string | undefined {
    return this.event.pathParameters?.[name];
  }

  /** Case-insensitive header lookup (API Gateway preserves case, Node lower-cases). */
  header(name: string): string | undefined {
    const wanted = name.toLowerCase();
    for (const [key, value] of Object.entries(this.event.headers ?? {})) {
      if (key.toLowerCase() === wanted) return value;
    }
    return undefined;
  }
}

/** Validates `value` against `schema`, turning failures into a 422 with field-level errors. */
export function validate<TOut, TIn = unknown>(
  schema: ZodType<TOut, ZodTypeDef, TIn>,
  value: unknown,
  location: Location,
): TOut {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ValidationFailedError(zodIssuesToFieldErrors(result.error, location));
  return result.data;
}
