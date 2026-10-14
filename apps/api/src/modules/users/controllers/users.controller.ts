import { listUsersQuerySchema } from '@leaveflow/contracts';
import { endpoint, HttpResponse } from '../../../shared/http/endpoint';
import { validate } from '../../../shared/http/request';

/** GET /users — feeds the validator dashboard's employee filter. */
const listUsers = endpoint({
  access: ['VALIDATOR'],
  parse: (request) => validate(listUsersQuerySchema, request.query(), 'query'),
  handle: async ({ role }, { container }) =>
    HttpResponse.ok({ items: await container.services.users.list(role) }),
});

export const listUsersParser = listUsers.parser;
export const listUsersHandler = listUsers.handler;
