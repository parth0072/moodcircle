import { z } from 'zod';

import { EMOTIONS } from '../../constants/emotions';

// Keep schema files free of Expo and React Native imports and use relative imports only:
// scripts/contract-check.mjs loads them under plain Node (type stripping plus a resolve hook).

/** A personal mood entry (src/controllers/entry.controller.js). `date` is the user's own local day. */
export const entrySchema = z.object({
  id: z.string(),
  emotion: z.enum(EMOTIONS),
  intensity: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  note: z.string(),
  date: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Entry = z.infer<typeof entrySchema>;

/** POST /entries and PATCH /entries/:id. */
export const entryResponse = z.object({ entry: entrySchema });

/** GET /entries?from=&to= (oldest first). */
export const entriesResponse = z.object({ entries: z.array(entrySchema) });

/** GET /entries/stats?date=. */
export const entryStatsResponse = z.object({
  stats: z.object({
    total: z.number().int(),
    currentStreak: z.number().int(),
    topEmotion: z.enum(EMOTIONS).nullable(),
    firstEntryDate: z.string().nullable(),
  }),
});

export type EntryStats = z.infer<typeof entryStatsResponse>['stats'];

/** DELETE /entries/:id. */
export const deleteEntryResponse = z.object({ message: z.string() });
