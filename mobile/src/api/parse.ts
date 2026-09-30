import type { ZodType } from 'zod';

import { ApiError } from './errors';

/** Validate a response body at the API boundary so contract drift fails loudly and typed. */
export function parseResponse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ApiError({
    kind: 'invalid-response',
    code: 'INVALID_RESPONSE',
    message: 'The server sent an unexpected response.',
  });
}
