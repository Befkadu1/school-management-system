import { describe, it, expect, vi } from 'vitest';
import { withDedupe, withLogging, withRetry } from './decorators';

describe('function decorators', () => {
  it('withRetry retries failures, then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('ok');

    await expect(withRetry(fn, { retries: 2, delayMs: 1 })()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withRetry gives up when shouldRetry says no', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400'));

    await expect(withRetry(fn, { retries: 3, delayMs: 1, shouldRetry: () => false })()).rejects.toThrow('400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('withRetry throws the last error once the attempts run out', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('still down'));

    await expect(withRetry(fn, { retries: 1, delayMs: 1 })()).rejects.toThrow('still down');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withDedupe shares one in-flight promise for identical calls', async () => {
    const fn = vi.fn(async (x: number) => x);
    const deduped = withDedupe(fn);

    await Promise.all([deduped(1), deduped(1), deduped(2)]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withDedupe lets a later call run once the first has settled', async () => {
    const fn = vi.fn(async (x: number) => x);
    const deduped = withDedupe(fn);

    await deduped(1);
    await deduped(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withLogging reports the label and the duration, even on failure', async () => {
    const log = vi.fn();

    await expect(withLogging(async () => { throw new Error('boom'); }, 'GET', log)()).rejects.toThrow('boom');
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET .*\d+ms$/));
  });

  it('nest so the outermost decorator wraps the rest', async () => {
    const calls: string[] = [];
    const inner = vi.fn(async () => { calls.push('fn'); return 'ok'; });
    const log = () => calls.push('logged');

    await withLogging(withDedupe(inner), 'GET', log)();
    // the wrapped function runs first; logging closes over it and reports after
    expect(calls).toEqual(['fn', 'logged']);
  });
});
