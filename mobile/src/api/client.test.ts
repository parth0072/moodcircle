import { createApiClient, type FetchLike } from './client';
import { isApiError, isRetryable } from './errors';

type Reply = { status: number; body: unknown };

function stubFetch(reply: Reply | (() => Promise<never>)) {
  return jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(async () => {
    if (typeof reply === 'function') return reply();
    const text = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
    return {
      status: reply.status,
      ok: reply.status >= 200 && reply.status < 300,
      text: async () => text,
    };
  });
}

function makeClient(fetch: FetchLike, token: string | null = 'tok-1', extra = {}) {
  const onUnauthorized = jest.fn();
  const client = createApiClient({
    baseUrl: 'https://api.test/api',
    fetch,
    getToken: () => token,
    onUnauthorized,
    ...extra,
  });
  return { client, onUnauthorized };
}

const unauthorized = { success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' };

describe('api client', () => {
  it('unwraps the success envelope', async () => {
    const { client } = makeClient(
      stubFetch({ status: 200, body: { success: true, data: { groups: [] } } }),
    );
    await expect(client.get('/groups')).resolves.toEqual({ groups: [] });
  });

  it('sends the bearer token and JSON body', async () => {
    const fetch = stubFetch({ status: 201, body: { success: true, data: {} } });
    const { client } = makeClient(fetch);
    await client.post('/groups', { name: 'Circle' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/api/groups');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"name":"Circle"}');
  });

  it('sends an explicit token instead of the session one, for the moment before sign-in', async () => {
    const fetch = stubFetch({ status: 200, body: { success: true, data: {} } });
    const { client } = makeClient(fetch, null);
    await client.patch('/profile', { name: 'Asha' }, { token: 'fresh-token' });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('ignores an explicit token when auth is false', async () => {
    const fetch = stubFetch({ status: 200, body: { success: true, data: {} } });
    const { client } = makeClient(fetch);
    await client.post('/auth/otp/request', {}, { auth: false, token: 'fresh-token' });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('omits the token when auth is false', async () => {
    const fetch = stubFetch({ status: 200, body: { success: true, data: {} } });
    const { client } = makeClient(fetch);
    await client.post('/auth/otp/request', { email: 'a@b.co' }, { auth: false });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('signs out only on the backend UNAUTHORIZED answer to an authenticated request', async () => {
    const { client, onUnauthorized } = makeClient(stubFetch({ status: 401, body: unauthorized }));
    await expect(client.get('/groups')).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith('tok-1');
  });

  it('does not sign out when a login attempt is rejected (wrong password)', async () => {
    const wrong = {
      success: false,
      message: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
    const { client, onUnauthorized } = makeClient(stubFetch({ status: 401, body: wrong }));
    await expect(
      client.post('/auth/password/login', { email: 'a@b.co', password: 'x' }, { auth: false }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not sign out for a 401 without the backend envelope (proxy, captive portal)', async () => {
    const { client, onUnauthorized } = makeClient(
      stubFetch({ status: 401, body: '<html>nope</html>' }),
    );
    await expect(client.get('/groups')).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      code: 'HTTP_ERROR',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not sign out when there is no token to reject', async () => {
    const { client, onUnauthorized } = makeClient(
      stubFetch({ status: 401, body: unauthorized }),
      null,
    );
    await expect(client.get('/groups')).rejects.toBeDefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('maps a network failure to a retryable network error and never signs out', async () => {
    const { client, onUnauthorized } = makeClient(
      stubFetch(async () => Promise.reject(new TypeError('Network request failed'))),
    );
    const error = await client.get('/groups').catch((e: unknown) => e);
    expect(isApiError(error) && error.kind === 'network').toBe(true);
    expect(isRetryable(error)).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('treats a 5xx HTML page as a retryable http error, not a sign-out', async () => {
    const { client, onUnauthorized } = makeClient(
      stubFetch({ status: 503, body: '<html>Service Unavailable</html>' }),
    );
    const error = await client.get('/groups').catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'http', status: 503, code: 'HTTP_ERROR' });
    expect(isRetryable(error)).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('flags a 200 that is not the envelope as invalid-response', async () => {
    const { client } = makeClient(stubFetch({ status: 200, body: '<html>login to wifi</html>' }));
    const error = await client.get('/groups').catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'invalid-response', code: 'INVALID_RESPONSE' });
    expect(isRetryable(error)).toBe(true);
  });

  it('surfaces validation messages and treats 4xx as final', async () => {
    const body = { success: false, message: 'Mood level must be 1–5', code: 'VALIDATION_ERROR' };
    const { client } = makeClient(stubFetch({ status: 422, body }));
    const error = await client.post('/groups/g/moods', { level: 9 }).catch((e: unknown) => e);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Mood level must be 1–5',
    });
    expect(isRetryable(error)).toBe(false);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const hang: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const { client } = makeClient(hang, 'tok-1', { timeoutMs: 20 });
    await expect(client.get('/groups')).rejects.toMatchObject({ kind: 'network' });
  });

  it('honours caller cancellation', async () => {
    const hang: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const { client } = makeClient(hang);
    const controller = new AbortController();
    const pending = client.get('/groups', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'network' });
  });
});
