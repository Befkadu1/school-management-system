import { describe, it, expect, vi } from 'vitest';
import { withRetry, withTimeout, withDedupe, compose } from './decorators';

describe('function decorators', () => {
  it('withRetry retries failures, then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('ok');
    await expect(withRetry({ retries: 2, delayMs: 1 })(fn)()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withRetry respects shouldRetry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400'));
    await expect(withRetry({ retries: 3, delayMs: 1, shouldRetry: () => false })(fn)()).rejects.toThrow('400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('withTimeout rejects slow calls', async () => {
    const slow = () => new Promise((r) => setTimeout(r, 50));
    await expect(withTimeout(5)(slow)()).rejects.toThrow(/Timed out/);
  });

  it('withDedupe shares one in-flight promise for identical calls', async () => {
    const fn = vi.fn(async (x: number) => x);
    const deduped = withDedupe<[number], number>()(fn);
    await Promise.all([deduped(1), deduped(1), deduped(2)]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('compose applies decorators outermost-first', async () => {
    const calls: string[] = [];
    const tag = (name: string) => (f: () => Promise<void>) => async () => { calls.push(name); await f(); };
    await compose<() => Promise<void>>(tag('outer'), tag('inner'))(async () => { calls.push('fn'); })();
    expect(calls).toEqual(['outer', 'inner', 'fn']);
  });
});
