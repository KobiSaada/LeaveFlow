/**
 * Minimal typed message buses. A Command expresses an intent to change state and has exactly one
 * handler; a Query reads state and has exactly one handler. Middleware wraps every dispatch
 * (logging, timing) without handlers knowing about it.
 */
export abstract class Message<TResult> {
  /** Phantom field carrying the result type; never set at runtime. */
  declare readonly __result?: TResult;
  abstract readonly type: string;
}

export abstract class Command<TResult> extends Message<TResult> {}
export abstract class Query<TResult> extends Message<TResult> {}

export type ResultOf<M> = M extends Message<infer R> ? R : never;

export interface MessageHandler<M extends Message<unknown>> {
  handle(message: M): Promise<ResultOf<M>>;
}

export type BusKind = 'command' | 'query';

export type Middleware = (
  message: Message<unknown>,
  kind: BusKind,
  next: () => Promise<unknown>,
) => Promise<unknown>;

class MessageBus<TBase extends Message<unknown>> {
  private readonly handlers = new Map<string, MessageHandler<TBase>>();

  constructor(
    private readonly kind: BusKind,
    private readonly middleware: readonly Middleware[],
  ) {}

  register<M extends TBase>(type: string, handler: MessageHandler<M>): void {
    if (this.handlers.has(type))
      throw new Error(`A ${this.kind} handler for ${type} is already registered`);
    this.handlers.set(type, handler as unknown as MessageHandler<TBase>);
  }

  dispatch<M extends TBase>(message: M): Promise<ResultOf<M>> {
    const handler = this.handlers.get(message.type);
    if (!handler)
      return Promise.reject(new Error(`No ${this.kind} handler registered for ${message.type}`));
    const invoke = (index: number): Promise<unknown> => {
      const middleware = this.middleware[index];
      return middleware
        ? middleware(message, this.kind, () => invoke(index + 1))
        : handler.handle(message);
    };
    return invoke(0) as Promise<ResultOf<M>>;
  }
}

export class CommandBus extends MessageBus<Command<unknown>> {
  constructor(middleware: readonly Middleware[] = []) {
    super('command', middleware);
  }
}

export class QueryBus extends MessageBus<Query<unknown>> {
  constructor(middleware: readonly Middleware[] = []) {
    super('query', middleware);
  }
}
