import { compose, withDedupe, withLogging, withRetry, withTimeout, type AsyncFn } from '../lib/decorators';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
}

export interface HttpClientOptions { baseUrl?: string; timeoutMs?: number; retries?: number; fetchImpl?: typeof fetch; log?: boolean }

/**
 * Factory pattern: builds a configured HTTP client. GET requests are decorated
 * with timeout, retry (only for network/5xx errors) and de-duplication;
 * writes are never retried automatically, to avoid saving something twice.
 */
export const createHttpClient = ({ baseUrl = '', timeoutMs = 15_000, retries = 2, fetchImpl = fetch, log = import.meta.env.DEV }: HttpClientOptions = {}): HttpClient => {
  const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
    return data as T;
  };

  const retryable = (e: unknown) => !(e instanceof HttpError) || e.status >= 500;
  const decorateGet = compose<AsyncFn<[string], unknown>>(
    ...(log ? [withLogging<[string], unknown>('GET')] : []),
    withDedupe<[string], unknown>((path) => path),
    withRetry<[string], unknown>({ retries, shouldRetry: retryable }),
    withTimeout<[string], unknown>(timeoutMs),
  );
  const get = decorateGet((path) => request('GET', path));
  const write = (method: string) => withTimeout<[string, unknown], unknown>(timeoutMs * 4)((path, body) => request(method, path, body));
  const post = write('POST');
  const put = write('PUT');

  return {
    get: <T>(path: string) => get(path) as Promise<T>,
    post: <T>(path: string, body: unknown) => post(path, body) as Promise<T>,
    put: <T>(path: string, body: unknown) => put(path, body) as Promise<T>,
  };
};
