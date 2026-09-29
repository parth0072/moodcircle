import { z } from 'zod';

/**
 * GET /streaks/me. The stored count is not decayed on read: if lastCheckInDate is older than
 * yesterday (IST) the real streak is 0 even though currentStreak still says otherwise.
 */
export const streakResponse = z.object({
  streak: z.object({ currentStreak: z.number(), lastCheckInDate: z.string().nullable() }),
});
