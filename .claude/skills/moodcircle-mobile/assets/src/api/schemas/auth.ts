import { z } from 'zod';

import { userSchema } from './user';

// Keep schema files free of Expo and React Native imports and use relative imports only:
// scripts/contract-check.mjs loads them under plain Node (type stripping plus a resolve hook).

/**
 * POST /auth/otp/request. The backend also returns `otp` whenever NODE_ENV is not production;
 * it is deliberately left out of this schema so zod strips it and app code can never read it.
 */
export const otpRequestResponse = z.object({ message: z.string() });

/** POST /auth/otp/verify and POST /auth/password/login. */
export const authResponse = z.object({ token: z.string(), user: userSchema });

/** POST /auth/password/set. */
export const setPasswordResponse = z.object({ message: z.string(), hasPassword: z.boolean() });

/** GET /profile/me and PATCH /profile (no email or hasPassword: merge into the session user). */
export const profileResponse = z.object({ user: userSchema });

export type AuthResponse = z.infer<typeof authResponse>;
