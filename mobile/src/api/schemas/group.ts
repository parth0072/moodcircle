import { z } from 'zod';

import { EMOTIONS } from '../../constants/emotions';
import { GROUP_COLOR_KEYS } from '../../constants/groups';

// Keep schema files free of Expo and React Native imports and use relative imports only:
// scripts/contract-check.mjs loads them under plain Node (type stripping plus a resolve hook).

/** A group as every group endpoint returns it (src/controllers/group.controller.js, sanitize). */
export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  createdBy: z.string(),
  memberCount: z.number(),
  isAdmin: z.boolean(),
  color: z.enum(GROUP_COLOR_KEYS),
  /** False for a "mood only" group: other people's notes are left out of the feed. */
  showNotes: z.boolean(),
  /** Whether the signed-in user shares their daily mood with this group automatically. */
  autoShare: z.boolean(),
  createdAt: z.string(),
});

export const memberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  avatar: z.string().nullable(),
});

/** GET /groups */
export const groupsResponse = z.object({ groups: z.array(groupSchema) });
/** POST /groups and POST /groups/join */
export const groupResponse = z.object({ group: groupSchema });
/** GET /groups/:groupId */
export const groupDetailResponse = z.object({ group: groupSchema, members: z.array(memberSchema) });
/** DELETE /groups/:groupId/leave, DELETE .../reactions/:reactionId */
export const messageResponse = z.object({ message: z.string() });

const overviewMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
});

/** One post made today: who (null when anonymous), the emotion and when. Never the words. */
const todayPostSchema = z.object({
  userId: z.string().nullable(),
  emotion: z.enum(EMOTIONS),
  createdAt: z.string(),
});

export const overviewGroupSchema = groupSchema.extend({
  members: z.array(overviewMemberSchema),
  today: z.array(todayPostSchema),
});

/** GET /groups/overview: the groups with who is in each and what was posted today. */
export const overviewResponse = z.object({ groups: z.array(overviewGroupSchema) });

/** What an invite code opens, before joining. */
export const groupPreviewSchema = z.object({
  /** The group's id, only for someone already in it (so the app can open it); null otherwise. */
  id: z.string().nullable(),
  name: z.string(),
  color: z.enum(GROUP_COLOR_KEYS),
  showNotes: z.boolean(),
  /** Null when the creator never gave a name. */
  createdByName: z.string().nullable(),
  memberCount: z.number(),
  isMember: z.boolean(),
});

/** GET /groups/preview?code= */
export const previewResponse = z.object({ group: groupPreviewSchema });

export type Group = z.infer<typeof groupSchema>;
export type Member = z.infer<typeof memberSchema>;
export type OverviewGroup = z.infer<typeof overviewGroupSchema>;
export type TodayPost = z.infer<typeof todayPostSchema>;
export type GroupPreview = z.infer<typeof groupPreviewSchema>;
