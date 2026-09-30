import { z } from 'zod';

/**
 * One schema for both user payloads the backend sends. Auth responses include `email` and
 * `hasPassword`; `GET /profile/me` and `PATCH /profile` omit them, so those are optional and
 * profile responses must be MERGED into the stored user (`mergeUserFields`), never replace it.
 * Unknown keys (the legacy `phone`) are stripped.
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
 * `!user.name`); the username is optional.
 */
export function isProfileComplete(user: Pick<User, 'name'>): boolean {
  return Boolean(user.name);
}

/**
 * `undefined` means "not in the answer", never "clear it": a profile response has no email, and
 * spreading it over the stored user would wipe the email. `null` does clear a field.
 */
export function mergeUserFields(user: User, patch: Partial<User>): User {
  const provided = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  return { ...user, ...provided };
}
