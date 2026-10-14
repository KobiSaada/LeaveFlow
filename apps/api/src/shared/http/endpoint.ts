import type { UserRole } from '@leaveflow/contracts';
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent';
import { type Container, getContainer } from '../../bootstrap/container';
import type { Principal } from '../security/principal';
import { ForbiddenError, UnauthenticatedError } from '../errors/application-errors';
import { HttpResponse } from './http-response';
import { requestContext } from './request-context';
import { EndpointRequest } from './request';

type Access = 'public' | readonly UserRole[];
type PrincipalFor<A extends Access> = A extends 'public' ? null : Principal;

interface EndpointContext<A extends Access> {
  principal: PrincipalFor<A>;
  container: Container;
  request: EndpointRequest;
}

interface EndpointSpec<A extends Access, TInput> {
  /** `'public'`, or the roles allowed to call the endpoint. */
  access: A;
  /** Turns the raw request into typed, validated input. Runs only after authorization succeeded. */
  parse: (request: EndpointRequest) => TInput;
  handle: (input: TInput, context: EndpointContext<A>) => Promise<HttpResponse | object>;
}

interface ParsedRequest<TInput> {
  readonly __parsed: true;
  input: TInput;
  principal: Principal | null;
  request: EndpointRequest;
}

function authenticate(request: EndpointRequest, container: Container): Principal {
  const header = request.header('authorization');
  const match = header ? /^Bearer\s+(.+)$/i.exec(header) : null;
  if (!match?.[1]) throw new UnauthenticatedError();
  return container.tokens.verify(match[1].trim());
}

/**
 * Builds the CEF pair for one route: the `x-inputParser` authenticates, authorizes and validates —
 * in that order, so an anonymous caller gets 401 rather than a validation error — and the
 * `x-handler` receives only trusted, typed input.
 */
export function endpoint<A extends Access, TInput>(spec: EndpointSpec<A, TInput>) {
  const parser = async (event: CommonEvent): Promise<ParsedRequest<TInput>> => {
    const container = await getContainer();
    const request = new EndpointRequest(event);
    let principal: Principal | null = null;
    if (spec.access !== 'public') {
      principal = authenticate(request, container);
      const context = requestContext.get();
      if (context) context.principal = principal;
      if (!spec.access.includes(principal.role)) throw new ForbiddenError();
    }
    return { __parsed: true, input: spec.parse(request), principal, request };
  };

  const handler = async (parsed: ParsedRequest<TInput>): Promise<HttpResponse | object> => {
    if (parsed?.__parsed !== true) {
      // A route declared without its x-inputParser would skip authorization: fail closed.
      throw new Error('Endpoint handler invoked without its input parser');
    }
    const container = await getContainer();
    return spec.handle(parsed.input, {
      principal: parsed.principal as PrincipalFor<A>,
      container,
      request: parsed.request,
    });
  };

  return { parser, handler };
}

export { HttpResponse };
