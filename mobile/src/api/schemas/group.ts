import { z } from 'zod';

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  createdBy: z.string(),
  memberCount: z.number(),
  isAdmin: z.boolean(),
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

export type Group = z.infer<typeof groupSchema>;
export type Member = z.infer<typeof memberSchema>;
