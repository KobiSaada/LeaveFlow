import { describe, expect, it } from 'vitest';
import { Command, CommandBus, type Middleware } from './bus';

class Double extends Command<number> {
  static readonly type = 'Double';
  readonly type = Double.type;
  constructor(readonly value: number) {
    super();
  }
}

describe('CommandBus', () => {
  it('dispatches to the registered handler and returns its result', async () => {
    const bus = new CommandBus();
    bus.register<Double>(Double.type, { handle: async (c) => c.value * 2 });
    await expect(bus.dispatch(new Double(21))).resolves.toBe(42);
  });

  it('runs middleware in registration order around the handler', async () => {
    const calls: string[] = [];
    const mw =
      (name: string): Middleware =>
      async (_m, _k, next) => {
        calls.push(`${name}:before`);
        const result = await next();
        calls.push(`${name}:after`);
        return result;
      };
    const bus = new CommandBus([mw('outer'), mw('inner')]);
    bus.register<Double>(Double.type, {
      handle: async (c) => {
        calls.push('handler');
        return c.value;
      },
    });
    await bus.dispatch(new Double(1));
    expect(calls).toEqual([
      'outer:before',
      'inner:before',
      'handler',
      'inner:after',
      'outer:after',
    ]);
  });

  it('rejects a command without a handler and refuses duplicate registration', async () => {
    const bus = new CommandBus();
    await expect(bus.dispatch(new Double(1))).rejects.toThrow(
      'No command handler registered for Double',
    );
    bus.register<Double>(Double.type, { handle: async () => 0 });
    expect(() => bus.register<Double>(Double.type, { handle: async () => 0 })).toThrow(
      'already registered',
    );
  });
});
