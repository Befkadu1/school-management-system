// Tiny functional helpers. Prefer composition of small pure functions.

export const pipe = <T>(value: T, ...fns: Array<(x: any) => any>): any => fns.reduce((acc, fn) => fn(acc), value);

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
};

/** Deterministic pseudo-random generator (mulberry32) so seed data is reproducible. */
export const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Higher-order function (a functional "decorator"): caches results for ttlMs. */
export const memoizeAsync = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, ttlMs: number, now = () => Date.now()) => {
  const cache = new Map<string, { at: number; value: Promise<R> }>();
  const wrapped = (...args: A): Promise<R> => {
    const key = JSON.stringify(args);
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    const value = fn(...args).catch((err) => { cache.delete(key); throw err; });
    cache.set(key, { at: now(), value });
    return value;
  };
  return Object.assign(wrapped, { clear: () => cache.clear() });
};
