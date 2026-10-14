import pino, { type DestinationStream, type Logger } from 'pino';
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

/** The production logger configuration; `destination` lets tests capture output. */
export function createLogger(
  options: { level?: string; destination?: DestinationStream } = {},
): Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
  const settings = {
    level,
    base: { service: 'leaveflow-api' },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (options.destination) return pino(settings, options.destination);
  const pretty = process.env.NODE_ENV === 'development' && process.stdout.isTTY;
  return pino(
    pretty
      ? { ...settings, transport: { target: 'pino-pretty', options: { singleLine: true } } }
      : settings,
  );
}

/** Created on first use, after CEF's loadEnv() has populated process.env. */
export function rootLogger(): Logger {
  root ??= createLogger();
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
