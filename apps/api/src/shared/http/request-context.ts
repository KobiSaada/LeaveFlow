import { AsyncLocalStorage } from 'node:async_hooks';
import type { Principal } from '../security/principal';

export interface RequestContext {
  requestId: string;
  principal?: Principal;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Per-request state (correlation id, authenticated principal) available to logs at any depth. */
export const requestContext = {
  run<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
    return storage.run(context, fn);
  },
  get(): RequestContext | undefined {
    return storage.getStore();
  },
};
