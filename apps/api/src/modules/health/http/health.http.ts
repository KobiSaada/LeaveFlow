import { endpoint, HttpResponse } from '../../../shared/http/endpoint';

/** GET /health — liveness plus a database round-trip; public, for local smoke checks. */
const getHealth = endpoint({
  access: 'public',
  parse: () => undefined,
  handle: async (_input, { container }) => {
    await container.dataSource.query('SELECT 1');
    return HttpResponse.ok({ status: 'ok', database: 'up' });
  },
});

export const getHealthParser = getHealth.parser;
export const getHealthHandler = getHealth.handler;
