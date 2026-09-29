import { ApiError } from '@/api/errors';

import { describeError } from './error-message';

const http = (status: number, message: string, code = 'X') =>
  new ApiError({ kind: 'http', status, code, message });

describe('describeError', () => {
  it('shows the backend message for a 4xx answer', () => {
    expect(describeError(http(401, 'Invalid email or password', 'INVALID_CREDENTIALS'))).toBe(
      'Invalid email or password',
    );
    expect(describeError(http(422, 'Valid email required', 'VALIDATION_ERROR'))).toBe(
      'Valid email required',
    );
  });

  it('keeps the friendly network message', () => {
    const error = new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'No connection',
    });
    expect(describeError(error)).toBe('No connection');
  });

  it('hides raw 5xx and unreadable-answer text', () => {
    expect(describeError(http(503, 'Request failed (503).', 'HTTP_ERROR'))).toMatch(
      /server is having trouble/,
    );
    const odd = new ApiError({ kind: 'invalid-response', code: 'INVALID_RESPONSE', message: 'x' });
    expect(describeError(odd)).toMatch(/server is having trouble/);
  });

  it('falls back for anything that is not an ApiError', () => {
    expect(describeError(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(describeError('nope', 'Custom')).toBe('Custom');
  });
});
