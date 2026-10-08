/**
 * Command bus for the UI. A user action becomes a command object; a handler
 * registered for that command's class knows how to carry it out. Components
 * say *what* should happen, never *how*, so the same command can be fired from
 * a button, a list row, a keyboard shortcut or a test.
 *
 * Mirrors the backend bus in backend/commands/bus.ts: the same middleware
 * chain wraps every dispatch, so logging and timing live in one place.
 */

/** Every command carries a stable name, so logs survive minification. */
export abstract class Command {
  abstract readonly name: string;
}

export type CommandType<C extends Command> = abstract new (...args: never[]) => C;

export interface CommandHandler<C extends Command, R = unknown> {
  handle(command: C): R | Promise<R>;
}

export class UnsupportedCommandError extends Error {
  constructor(command: Command) { super(`No handler registered for ${command.name}`); }
}

type Next = (command: Command) => Promise<unknown>;
export type Middleware = (next: Next) => Next;

export const logging = (log: (line: string) => void = console.log): Middleware => (next) => async (command) => {
  const started = performance.now();
  try {
    const result = await next(command);
    log(`[command] ${command.name} ok in ${(performance.now() - started).toFixed(1)}ms`);
    return result;
  } catch (err) {
    log(`[command] ${command.name} failed: ${(err as Error).message}`);
    throw err;
  }
};

export class CommandBus {
  private handlers = new Map<CommandType<never>, CommandHandler<never>>();
  private dispatch: Next;

  constructor(middleware: Middleware[] = []) {
    // async, so an unknown command or a throwing handler rejects rather than
    // throwing at the call site — callers always get a promise.
    const base: Next = async (command) => {
      const handler = this.handlers.get(command.constructor as CommandType<never>);
      if (!handler) throw new UnsupportedCommandError(command);
      return (handler as CommandHandler<Command>).handle(command);
    };
    // compose right-to-left so the first middleware in the list runs first
    this.dispatch = middleware.reduceRight<Next>((next, mw) => mw(next), base);
  }

  public register<C extends Command, R>(type: CommandType<C>, handler: CommandHandler<C, R>): void {
    this.handlers.set(type as CommandType<never>, handler as CommandHandler<never>);
  }

  public isSupported<C extends Command>(type: CommandType<C>): boolean {
    return this.handlers.has(type as CommandType<never>);
  }

  public handle<R = unknown>(command: Command): Promise<R> {
    return this.dispatch(command) as Promise<R>;
  }
}
