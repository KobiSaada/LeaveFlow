import { randomUUID } from 'node:crypto';
import {
  type APIGatewayProxyStructuredResultV2,
  buildCommonEvent,
  type Context,
  getRouteConfig,
  resolveHandlerRef,
  Response,
  setLambdaContext,
} from 'commoneventframework';
import type { CommonEvent, LambdaEvent } from 'commoneventframework/dist/types/commonEvent';
import { RouteNotFoundError } from './shared/errors/application-errors';
import { HttpResponse } from './shared/http/http-response';
import { toProblem } from './shared/http/problem-details';
import { type RequestContext, requestContext } from './shared/http/request-context';
import { logger } from './shared/logging/logger';

type LambdaResult = APIGatewayProxyStructuredResultV2;
type RouteFn = (...args: unknown[]) => unknown;

/** CEF built-ins that expose runtime metadata; served only in development. */
const DEVELOPMENT_ONLY_PATHS = new Set(['/context', '/dependencies']);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function headerValue(event: CommonEvent | undefined, name: string): string | undefined {
  for (const [key, value] of Object.entries(event?.headers ?? {})) {
    if (key.toLowerCase() === name) return value;
  }
  return undefined;
}

function isLambdaResult(value: unknown): value is LambdaResult {
  return typeof value === 'object' && value !== null && 'statusCode' in value;
}

function toLambdaResult(output: unknown): LambdaResult {
  if (output instanceof HttpResponse) {
    return new Response(output.status, (output.body ?? {}) as object, output.headers);
  }
  if (isLambdaResult(output)) return output; // CEF built-ins (/doc) and raw results
  return new Response(200, (output ?? {}) as object);
}

async function dispatch(event: CommonEvent): Promise<LambdaResult> {
  if (DEVELOPMENT_ONLY_PATHS.has(event.path) && process.env.NODE_ENV !== 'development') {
    throw new RouteNotFoundError(event.method, event.path);
  }
  const route = getRouteConfig(event);
  if (!route?.handler) throw new RouteNotFoundError(event.method, event.path);

  const handler = resolveHandlerRef(route.handler) as RouteFn | undefined;
  if (!handler) throw new Error(`Handler "${route.handler}" is not registered`);
  const parser = route.inputParser
    ? (resolveHandlerRef(route.inputParser) as RouteFn | undefined)
    : undefined;
  if (route.inputParser && !parser)
    throw new Error(`Input parser "${route.inputParser}" is not registered`);

  // Unlike CEF's sample entry point, the parser is awaited, so it may be async.
  const input = parser ? await parser(event) : {};
  if (isLambdaResult(input)) return input; // CEF convention: a parser may short-circuit with a Response
  return toLambdaResult(await handler(input, event));
}

/**
 * The Lambda/CEF entry. It never throws: CEF's dev server crashes when a handler rejects (its catch
 * block calls res.end() with an object), and on Lambda an unhandled rejection becomes an opaque 502.
 * Every outcome is a Response — Problem Details for failures — with an x-request-id header.
 */
export function createHttpHandler(options: { rootYamlPath: string }) {
  let routesLoaded = false;

  return async function handler(rawEvent: LambdaEvent, context: Context): Promise<LambdaResult> {
    const startedAt = performance.now();
    const ctx: RequestContext = { requestId: randomUUID() };

    return requestContext.run(ctx, async () => {
      let event: CommonEvent | undefined;
      let result: LambdaResult;
      let errorCode: string | undefined;
      try {
        await setLambdaContext(context);
        // First call loads routes from an explicit path: CEF's own lookup starts from argv[1],
        // which is not the API directory under test runners.
        event = routesLoaded
          ? buildCommonEvent(rawEvent)
          : buildCommonEvent(rawEvent, options.rootYamlPath);
        routesLoaded = true;
        const incomingId = headerValue(event, 'x-request-id');
        if (incomingId && REQUEST_ID_PATTERN.test(incomingId)) ctx.requestId = incomingId;
        result = await dispatch(event);
      } catch (error) {
        const problem = toProblem(error, ctx.requestId);
        errorCode = problem.body.code;
        if (problem.unexpected) logger().error({ err: error }, 'unhandled error');
        result = new Response(problem.status, problem.body, {
          'Content-Type': 'application/problem+json',
        });
      }

      result.headers = { ...result.headers, 'x-request-id': ctx.requestId };
      const status = result.statusCode ?? 200;
      logger()[status >= 500 ? 'error' : 'info'](
        {
          method: event?.method,
          path: event?.path,
          status,
          durationMs: Math.round(performance.now() - startedAt),
          ...(errorCode ? { errorCode } : {}),
        },
        'request completed',
      );
      return result;
    });
  };
}
