import { z } from 'zod';

/**
 * One schema for both user payloads the backend sends. Auth responses include `email` and
 * `hasPassword`; `GET /profile/me` and `PATCH /profile` omit them, so those are optional and
 * profile responses must be MERGED into the stored user, never replace it. Unknown keys
 * (the legacy `phone`) are stripped.
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().nullish(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  avatar: z.string().nullable(),
  isPremium: z.boolean(),
  hasPassword: z.boolean().optional(),
  joyActivities: z.array(z.string()),
  joyOnboarded: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Profile setup is required until the user has a display name (the web's boot() checks
 * `!user.name`); the username is optional. `joyOnboarded` must NOT gate this (see architecture.md).
 */
export function isProfileComplete(user: Pick<User, 'name'>): boolean {
  return Boolean(user.name);
}
