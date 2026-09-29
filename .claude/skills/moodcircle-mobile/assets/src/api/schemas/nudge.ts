import { z } from 'zod';

/** POST /groups/:groupId/nudge. Nudges are stored only: there is no inbox or delivery yet. */
export const nudgeResponse = z.object({
  nudge: z.object({
    id: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    groupId: z.string(),
    date: z.string(),
    createdAt: z.string(),
  }),
});
