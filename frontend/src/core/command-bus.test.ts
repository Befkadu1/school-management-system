import { describe, expect, it, vi } from 'vitest';
import { Command, CommandBus, UnsupportedCommandError, logging } from './command-bus';

class Greet extends Command {
  readonly name = 'Greet';
  constructor(public readonly who: string) { super(); }
}
class Shout extends Command { readonly name = 'Shout'; }

describe('CommandBus', () => {
  it('routes a command to the handler registered for its class', async () => {
    const bus = new CommandBus();
    bus.register(Greet, { handle: (c: Greet) => `hello ${c.who}` });

    await expect(bus.handle(new Greet('Hana'))).resolves.toBe('hello Hana');
  });

  it('reports which commands it supports', () => {
    const bus = new CommandBus();
    bus.register(Greet, { handle: () => undefined });

    expect(bus.isSupported(Greet)).toBe(true);
    expect(bus.isSupported(Shout)).toBe(false);
  });

  it('rejects a command with no handler', async () => {
    await expect(new CommandBus().handle(new Shout())).rejects.toBeInstanceOf(UnsupportedCommandError);
  });

  it('runs every command through the middleware chain', async () => {
    const log = vi.fn();
    const bus = new CommandBus([logging(log)]);
    bus.register(Greet, { handle: () => 'ok' });

    await bus.handle(new Greet('Hana'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[command] Greet ok'));
  });

  it('logs and rethrows when a handler fails', async () => {
    const log = vi.fn();
    const bus = new CommandBus([logging(log)]);
    bus.register(Shout, { handle: () => { throw new Error('too loud'); } });

    await expect(bus.handle(new Shout())).rejects.toThrow('too loud');
    expect(log).toHaveBeenCalledWith('[command] Shout failed: too loud');
  });
});
