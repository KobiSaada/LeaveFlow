import { listUsersQuerySchema } from '@leaveflow/contracts';
import { endpoint, HttpResponse } from '../../../shared/http/endpoint';
import { validate } from '../../../shared/http/request';
import { ListUsersQuery } from '../application/list-users.query';

/** GET /users — feeds the validator dashboard's employee filter. */
const listUsers = endpoint({
  access: ['VALIDATOR'],
  parse: (request) => validate(listUsersQuerySchema, request.query(), 'query'),
  handle: async ({ role }, { container }) =>
    HttpResponse.ok({ items: await container.queryBus.dispatch(new ListUsersQuery(role)) }),
});

export const listUsersParser = listUsers.parser;
export const listUsersHandler = listUsers.handler;
