import { loginRequestSchema } from '@leaveflow/contracts';
import { endpoint, HttpResponse } from '../../../shared/http/endpoint';
import { validate } from '../../../shared/http/request';

/** POST /auth/login */
const login = endpoint({
  access: 'public',
  parse: (request) => validate(loginRequestSchema, request.body(), 'body'),
  handle: async ({ email, password }, { container }) =>
    HttpResponse.ok(await container.services.auth.login(email, password)),
});

/** GET /auth/me */
const me = endpoint({
  access: ['REQUESTER', 'VALIDATOR'],
  parse: () => undefined,
  handle: async (_input, { principal, container }) =>
    HttpResponse.ok(await container.services.auth.me(principal.userId)),
});

export const loginParser = login.parser;
export const loginHandler = login.handler;
export const meParser = me.parser;
export const meHandler = me.handler;
