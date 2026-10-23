import { withDedupe, withLogging, withRetry } from '../lib/decorators';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
}

export interface HttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  log?: boolean;
}

/** A dropped connection or a 5xx is worth another try; a 4xx is the caller's fault. */
const isRetryable = (error: unknown) => !(error instanceof HttpError) || error.status >= 500;

/**
 * Factory pattern: builds a configured HTTP client. Reads are retried and
 * de-duplicated; writes are neither, because retrying a POST could record the
 * same fee payment twice.
 */
export const createHttpClient = ({
  baseUrl = '',
  timeoutMs = 15_000,
  retries = 2,
  fetchImpl = fetch,
  log = import.meta.env.DEV,
}: HttpClientOptions = {}): HttpClient => {
  const send = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const hasBody = body !== undefined;
    // A write is allowed to take longer than a read before it is given up on.
    const budgetMs = method === 'GET' ? timeoutMs : timeoutMs * 4;

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: hasBody ? { 'content-type': 'application/json' } : undefined,
        body: hasBody ? JSON.stringify(body) : undefined,
        // Unlike a promise race, this actually cancels the request.
        signal: AbortSignal.timeout(budgetMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error(`Timed out after ${budgetMs}ms`, { cause: error });
      }
      throw error;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new HttpError(response.status, (data as { error?: string }).error ?? `Request failed (${response.status})`);
    }

    return data;
  };

  // Each line adds one behaviour to the line above it.
  const fetchJson = (path: string) => send('GET', path);
  const retrying = withRetry(fetchJson, { retries, shouldRetry: isRetryable });
  const deduped = withDedupe(retrying, (path) => path);
  const get = log ? withLogging(deduped, 'GET') : deduped;

  return {
    get: <T>(path: string) => get(path) as Promise<T>,
    post: <T>(path: string, body: unknown) => send('POST', path, body) as Promise<T>,
    put: <T>(path: string, body: unknown) => send('PUT', path, body) as Promise<T>,
  };
};
