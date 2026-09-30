import { z } from 'zod';

export const moodLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/** All five are accepted by the backend; the web UI offers only the first three. */
export const reactionTypeSchema = z.enum([
  'sending_love',
  'same',
  'rooting_for_you',
  'hang_in_there',
  'so_happy_for_you',
]);

export const feedReactionSchema = z.object({
  id: z.string(),
  type: reactionTypeSchema,
  userId: z.string(),
  createdAt: z.string(),
});

/** Anonymous posts hide the author entirely, so they cannot be nudged. */
const feedUserSchema = z.union([
  z.object({ anonymous: z.literal(true) }),
  z.object({
    id: z.string().optional(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    avatar: z.string().nullable(),
  }),
]);

export const feedItemSchema = z.object({
  id: z.string(),
  user: feedUserSchema,
  isOwn: z.boolean(),
  level: moodLevelSchema,
  note: z.string(),
  isAnonymous: z.boolean(),
  /** YYYY-MM-DD in IST. */
  date: z.string(),
  createdAt: z.string(),
  reactions: z.array(feedReactionSchema),
});

/** POST /groups/:groupId/moods */
export const postMoodResponse = z.object({ mood: feedItemSchema });

/** GET /groups/:groupId/moods/today */
export const todayResponse = z.object({
  feed: z.array(feedItemSchema),
  /** Average level of today's check-ins to one decimal, null when nobody has checked in. */
  vibeScore: z.number().nullable(),
  checkedIn: z.number(),
  totalMembers: z.number(),
});

/** GET /groups/:groupId/moods/history?days=7|30|90. The whole group, oldest first. */
export const historyResponse = z.object({ history: z.array(feedItemSchema), days: z.number() });

/** POST /moods/:moodId/reactions */
export const reactionResponse = z.object({
  reaction: z.object({
    id: z.string(),
    moodId: z.string(),
    userId: z.string(),
    type: reactionTypeSchema,
    createdAt: z.string(),
  }),
});

export type FeedItem = z.infer<typeof feedItemSchema>;
export type ReactionType = z.infer<typeof reactionTypeSchema>;
