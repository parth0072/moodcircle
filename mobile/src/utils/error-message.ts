import { isApiError } from '@/api/errors';

/**
 * A sentence a person can read for any failure. Backend messages for 4xx answers are written for
 * users (see references/api-contract.md in the skill); network problems already carry a friendly
 * message; server faults and unreadable answers must not leak "Request failed (503)".
 */
export function describeError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!isApiError(error)) return fallback;
  if (error.kind === 'network') return error.message;
  if (error.kind === 'invalid-response' || error.status >= 500) {
    return 'The server is having trouble right now. Please try again in a moment.';
  }
  return error.message || fallback;
}
