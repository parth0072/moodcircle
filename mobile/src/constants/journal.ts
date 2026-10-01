// The journal's vocabulary and the server's limits (src/routes/journal.routes.js). Keep this file
// free of React Native imports: api/schemas loads it under plain Node for scripts/contract-check.mjs.
import type { Emotion } from './emotions';

export const ENTRY_TYPES = ['note', 'memory'] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export const entryTypeLabels: Record<EntryType, string> = { note: 'Note', memory: 'Memory' };

export const TITLE_MAX = 80;
export const BODY_MAX = 5000;
export const PHOTOS_MAX = 6;
export const MESSAGE_MAX = 200;
export const REPLY_MAX = 500;
export const SEARCH_MAX = 100;

/** The order the "Write a note or memory" screen lists the moods in (the Home screen's differs). */
export const WRITE_EMOTIONS: readonly Emotion[] = ['sad', 'worry', 'calm', 'joy', 'anger', 'meh'];

/** Moods that make the write screen offer "Tell a friend". */
export const HEAVY_EMOTIONS: readonly Emotion[] = ['sad', 'worry'];

/** The design's two writing prompts under the text: a tap starts a new line in it with the prompt. */
export const WRITING_PROMPTS = ['What happened?', 'What would help right now?'] as const;
