// Decorator pattern, functional style: each function takes an async function and
// returns a new one with extra behaviour, without changing the original.
// They stack: withLogging(withRetry(withTimeout(fetchJson))).

export type AsyncFn<A extends unknown[], R> = (...args: A) => Promise<R>;

export const withTimeout = <A extends unknown[], R>(ms: number) => (fn: AsyncFn<A, R>): AsyncFn<A, R> =>
  (...args) => new Promise<R>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    fn(...args).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });

export interface RetryOptions { retries?: number; delayMs?: number; shouldRetry?: (e: unknown) => boolean }

export const withRetry = <A extends unknown[], R>(
  { retries = 2, delayMs = 300, shouldRetry = () => true }: RetryOptions = {},
) => (fn: AsyncFn<A, R>): AsyncFn<A, R> => async (...args) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** attempt)); // exponential backoff
    }
  }
};

export const withLogging = <A extends unknown[], R>(label: string, log: (msg: string) => void = console.debug) =>
  (fn: AsyncFn<A, R>): AsyncFn<A, R> => async (...args) => {
    const started = performance.now();
    try {
      return await fn(...args);
    } finally {
      log(`${label}(${JSON.stringify(args[0] ?? '')}) ${(performance.now() - started).toFixed(0)}ms`);
    }
  };

/** Identical calls that are already in flight share one promise (avoids duplicate requests). */
export const withDedupe = <A extends unknown[], R>(key: (...args: A) => string = (...a) => JSON.stringify(a)) =>
  (fn: AsyncFn<A, R>): AsyncFn<A, R> => {
    const inFlight = new Map<string, Promise<R>>();
    return (...args) => {
      const k = key(...args);
      const existing = inFlight.get(k);
      if (existing) return existing;
      const p = fn(...args).finally(() => inFlight.delete(k));
      inFlight.set(k, p);
      return p;
    };
  };

export const compose = <T>(...decorators: Array<(f: T) => T>) => (fn: T): T =>
  decorators.reduceRight((acc, d) => d(acc), fn);
