import type { Repos } from '../repositories/types.js';
import type { z } from 'zod';

/**
 * Command pattern: every write operation is an object with a name, an input
 * schema and an execute function. The bus runs them through a middleware chain,
 * so cross-cutting concerns (validation, logging, timing) live in one place.
 */
export interface CommandContext { repos: Repos; today: string }

export interface Command<I, R> {
  readonly name: string;
  readonly schema: z.ZodType<I>;
  execute(input: I, ctx: CommandContext): Promise<R>;
}

export class CommandError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type Handler = (cmd: Command<any, any>, input: unknown, ctx: CommandContext) => Promise<unknown>;
export type Middleware = (next: Handler) => Handler;

/** Decorator-style middleware: each one wraps the next handler. */
export const validation: Middleware = (next) => async (cmd, input, ctx) => {
  const parsed = cmd.schema.safeParse(input);
  if (!parsed.success) {
    throw new CommandError(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
  }
  return next(cmd, parsed.data, ctx);
};

export const logging = (log: (line: string) => void = console.log): Middleware => (next) => async (cmd, input, ctx) => {
  const started = performance.now();
  try {
    const result = await next(cmd, input, ctx);
    log(`[command] ${cmd.name} ok in ${(performance.now() - started).toFixed(1)}ms`);
    return result;
  } catch (err) {
    log(`[command] ${cmd.name} failed: ${(err as Error).message}`);
    throw err;
  }
};

export const createCommandBus = (ctx: () => CommandContext, middleware: Middleware[] = [logging(), validation]) => {
  const base: Handler = (cmd, input, c) => cmd.execute(input, c);
  // compose right-to-left so the first middleware in the list runs first
  const handler = middleware.reduceRight<Handler>((next, mw) => mw(next), base);
  return {
    dispatch: <I, R>(cmd: Command<I, R>, input: unknown): Promise<R> => handler(cmd, input, ctx()) as Promise<R>,
  };
};

export type CommandBus = ReturnType<typeof createCommandBus>;
