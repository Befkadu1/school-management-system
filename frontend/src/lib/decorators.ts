/**
 * Decorator pattern, functional style: each function takes an async function
 * and returns a new one with extra behaviour, leaving the original alone.
 *
 * They take the function as their first argument, so they nest and TypeScript
 * infers the argument and return types from it:
 *
 *   const get = withLogging(withDedupe(withRetry(fetchJson)), 'GET');
 */

export type AsyncFn<A extends unknown[], R> = (...args: A) => Promise<R>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/** Retries a failed call, backing off twice as long each time. */
export const withRetry = <A extends unknown[], R>(
  fn: AsyncFn<A, R>,
  { retries = 2, delayMs = 300, shouldRetry = () => true }: RetryOptions = {},
): AsyncFn<A, R> => async (...args) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(...args);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      await wait(delayMs * 2 ** attempt);
    }
  }
};

/** Identical calls that are already in flight share one promise. */
export const withDedupe = <A extends unknown[], R>(
  fn: AsyncFn<A, R>,
  keyOf: (...args: A) => string = (...args) => JSON.stringify(args),
): AsyncFn<A, R> => {
  const inFlight = new Map<string, Promise<R>>();

  return (...args) => {
    const key = keyOf(...args);
    const running = inFlight.get(key);
    if (running) return running;

    const pending = fn(...args).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
    return pending;
  };
};

/** Logs how long each call took, whether it succeeded or threw. */
export const withLogging = <A extends unknown[], R>(
  fn: AsyncFn<A, R>,
  label: string,
  log: (message: string) => void = console.debug,
): AsyncFn<A, R> => async (...args) => {
  const started = performance.now();
  try {
    return await fn(...args);
  } finally {
    log(`${label} ${args[0] ?? ''} ${Math.round(performance.now() - started)}ms`);
  }
};
