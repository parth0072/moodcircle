export type ApiErrorKind = 'network' | 'http' | 'invalid-response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or 0 when no response was received. */
  readonly status: number;
  /** Backend `code` (e.g. ALREADY_CHECKED_IN), or NETWORK_ERROR / HTTP_ERROR / INVALID_RESPONSE. */
  readonly code: string;

  constructor(init: { kind: ApiErrorKind; code: string; message: string; status?: number }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? 0;
    this.code = init.code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * True when "try again" can help: no answer, an unreadable answer, or a server fault.
 * False for errors the user has to act on (bad code, taken username, ...).
 */
export function isRetryable(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.kind === 'network' || error.kind === 'invalid-response' || error.status >= 500)
  );
}
