import pino, { type Logger } from 'pino';
import { requestContext } from '../http/request-context';

/**
 * Paths never written to logs: credentials, tokens and free-text fields that may hold personal data.
 * Request/response bodies are not logged at all; this is a second line of defence.
 */
const REDACT_PATHS = [
  'authorization',
  'headers.authorization',
  '*.authorization',
  'password',
  '*.password',
  'passwordHash',
  '*.passwordHash',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'reason',
  '*.reason',
  'comment',
  '*.comment',
  'comments',
  '*.comments',
];

let root: Logger | undefined;

function createRootLogger(): Logger {
  const level = process.env.LOG_LEVEL ?? 'info';
  const pretty = process.env.NODE_ENV === 'development' && process.stdout.isTTY;
  return pino({
    level,
    base: { service: 'leaveflow-api' },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(pretty ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
  });
}

/** Created on first use, after CEF's loadEnv() has populated process.env. */
export function rootLogger(): Logger {
  root ??= createRootLogger();
  return root;
}

/** Logger bound to the current request's correlation id and user, when there is one. */
export function logger(): Logger {
  const context = requestContext.get();
  if (!context) return rootLogger();
  return rootLogger().child({
    requestId: context.requestId,
    ...(context.principal
      ? { userId: context.principal.userId, role: context.principal.role }
      : {}),
  });
}

/** Test hook: lets a test capture log output by installing its own root logger. */
export function setRootLogger(next: Logger | undefined): void {
  root = next;
}
