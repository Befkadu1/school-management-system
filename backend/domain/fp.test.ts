import { describe, it, expect, vi } from 'vitest';
import { memoizeAsync, addDays, seededRandom } from './fp.js';

describe('fp helpers', () => {
  it('memoizeAsync caches within the TTL and recomputes after it', async () => {
    let clock = 0;
    const fn = vi.fn(async (x: number) => x * 2);
    const cached = memoizeAsync(fn, 1000, () => clock);
    await cached(2); await cached(2);
    expect(fn).toHaveBeenCalledTimes(1);
    clock = 1500;
    await cached(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('seededRandom is deterministic', () => {
    const a = seededRandom(7), b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
