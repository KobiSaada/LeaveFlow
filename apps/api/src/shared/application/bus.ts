/**
 * Typed command bus. A command expresses an intent to change state and has exactly one handler.
 * Middleware wraps every dispatch (logging, timing) without handlers knowing about it.
 */
export abstract class Command<TResult> {
  /** Phantom field carrying the result type; never set at runtime. */
  declare readonly __result?: TResult;
  abstract readonly type: string;
}

export type ResultOf<C> = C extends Command<infer R> ? R : never;

export interface CommandHandler<C extends Command<unknown>> {
  handle(command: C): Promise<ResultOf<C>>;
}

export type Middleware = (
  command: Command<unknown>,
  next: () => Promise<unknown>,
) => Promise<unknown>;

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command<unknown>>>();

  constructor(private readonly middleware: readonly Middleware[] = []) {}

  register<C extends Command<unknown>>(type: string, handler: CommandHandler<C>): void {
    if (this.handlers.has(type))
      throw new Error(`A command handler for ${type} is already registered`);
    this.handlers.set(type, handler as unknown as CommandHandler<Command<unknown>>);
  }

  dispatch<C extends Command<unknown>>(command: C): Promise<ResultOf<C>> {
    const handler = this.handlers.get(command.type);
    if (!handler)
      return Promise.reject(new Error(`No command handler registered for ${command.type}`));
    const invoke = (index: number): Promise<unknown> => {
      const middleware = this.middleware[index];
      return middleware ? middleware(command, () => invoke(index + 1)) : handler.handle(command);
    };
    return invoke(0) as Promise<ResultOf<C>>;
  }
}
