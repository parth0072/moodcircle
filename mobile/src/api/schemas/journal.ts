import { z } from 'zod';

import { EMOTIONS } from '../../constants/emotions';
import { ENTRY_TYPES } from '../../constants/journal';

// Keep schema files free of Expo and React Native imports and use relative imports only:
// scripts/contract-check.mjs loads them under plain Node (type stripping plus a resolve hook).

/** Someone's name as the journal shows it; null when they never gave one. */
export const personSchema = z.object({ id: z.string(), name: z.string().nullable() });

/**
 * A photo of an entry. `url` is relative to the API root as the server sends it
 * (`/journal/photos/<id>/file?e=&s=`); api/journal.ts makes it absolute before the app sees it.
 */
export const journalPhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const lovesSchema = z.object({ count: z.number(), mine: z.boolean() });

export const replySchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: personSchema,
  isMine: z.boolean(),
});

/** An entry as the list returns it: a short excerpt, no replies. */
export const journalEntrySchema = z.object({
  id: z.string(),
  type: z.enum(ENTRY_TYPES),
  emotion: z.enum(EMOTIONS),
  title: z.string(),
  excerpt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** False for an entry someone shared with the signed-in person. */
  isMine: z.boolean(),
  owner: personSchema,
  /** Empty when the owner shared the words without the photos. */
  photos: z.array(journalPhotoSchema),
  photoCount: z.number(),
  /** The owner's view: who it was sent to. Always empty for the people it was shared with. */
  sharedWith: z.array(personSchema),
  /** For the people it was shared with: the message that came with it. */
  sharedMessage: z.string().nullable(),
  loves: lovesSchema,
  replyCount: z.number(),
});

/** One entry in full (GET /journal/:id, and the answer to writing or changing one). */
export const journalEntryDetailSchema = journalEntrySchema.extend({
  body: z.string(),
  replies: z.array(replySchema),
});

/** Someone an entry can be sent to: a person in a group with the signed-in user. */
export const sharePersonSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  avatar: z.string().nullable(),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
});

/** GET /journal */
export const journalListResponse = z.object({
  entries: z.array(journalEntrySchema),
  /** Pass as `before` for the next page; null when there are no more. */
  nextBefore: z.string().nullable(),
});
/** GET, POST and PATCH /journal(/:id) */
export const journalEntryResponse = z.object({ entry: journalEntryDetailSchema });
/** POST /journal/photos */
export const photoResponse = z.object({ photo: journalPhotoSchema });
/** GET /journal/people */
export const peopleResponse = z.object({ people: z.array(sharePersonSchema) });
/** PUT /journal/:id/shares */
export const sharesResponse = z.object({ sharedWith: z.array(personSchema) });
/** PUT and DELETE /journal/:id/love */
export const lovesResponse = z.object({ loves: lovesSchema });
/** POST /journal/:id/replies */
export const replyResponse = z.object({ reply: replySchema });

export type Person = z.infer<typeof personSchema>;
export type JournalPhoto = z.infer<typeof journalPhotoSchema>;
export type Loves = z.infer<typeof lovesSchema>;
export type Reply = z.infer<typeof replySchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type JournalEntryDetail = z.infer<typeof journalEntryDetailSchema>;
export type SharePerson = z.infer<typeof sharePersonSchema>;
