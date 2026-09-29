import { ApiError } from './errors';

/** The slice of `fetch` the client uses. `expo/fetch` satisfies it; tests pass a stub. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ status: number; ok: boolean; text(): Promise<string> }>;

export interface ApiClientOptions {
  /** Includes the `/api` prefix and any BASE_PATH, no trailing slash. */
  baseUrl: string;
  fetch: FetchLike;
  getToken: () => string | null;
  /** Receives the token that was rejected, so the caller can ignore a stale answer. */
  onUnauthorized: (rejectedToken: string) => void;
  timeoutMs?: number;
}

export interface RequestOptions {
  body?: unknown;
  /**
   * Send the session token (default). Pass `false` for sign-in calls: a 401 there means
   * "wrong credentials", never "your session expired".
   */
  auth?: boolean;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, fetch, getToken, onUnauthorized, timeoutMs = 15_000 } = options;

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { body, auth = true, signal } = opts;
    const token = auth ? getToken() : null;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    // One controller carries both our timeout and the caller's cancellation (React Query passes a signal).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const forwardAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });

    let status: number;
    let ok: boolean;
    let text: string;
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      status = res.status;
      ok = res.ok;
      text = await res.text();
    } catch {
      throw new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: NETWORK_MESSAGE });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }

    const json = parseJson(text);
    if (ok && isSuccess(json)) return json.data as T;

    if (isFailure(json)) {
      // Only the backend's own auth middleware answer counts as "session is over". A bare 401
      // from a proxy or a login endpoint must never sign the user out.
      if (status === 401 && token && json.code === 'UNAUTHORIZED') onUnauthorized(token);
      throw new ApiError({ kind: 'http', status, code: json.code, message: json.message });
    }
    if (ok) {
      throw new ApiError({
        kind: 'invalid-response',
        status,
        code: 'INVALID_RESPONSE',
        message: 'The server sent an unexpected response.',
      });
    }
    throw new ApiError({
      kind: 'http',
      status,
      code: 'HTTP_ERROR',
      message: `Request failed (${status}).`,
    });
  }

  type Extra = Omit<RequestOptions, 'body'>;
  return {
    get: <T>(path: string, extra?: Extra) => request<T>('GET', path, extra),
    post: <T>(path: string, body?: unknown, extra?: Extra) =>
      request<T>('POST', path, { ...extra, body }),
    patch: <T>(path: string, body?: unknown, extra?: Extra) =>
      request<T>('PATCH', path, { ...extra, body }),
    delete: <T>(path: string, extra?: Extra) => request<T>('DELETE', path, extra),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSuccess(value: unknown): value is { success: true; data: unknown } {
  return isObject(value) && value.success === true && 'data' in value;
}

function isFailure(value: unknown): value is { success: false; code: string; message: string } {
  return (
    isObject(value) &&
    value.success === false &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  );
}
