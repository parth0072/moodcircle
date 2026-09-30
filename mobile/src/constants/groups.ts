// What the group screens of the Moodbloom design offer. Keep this file free of React Native
// imports: api/schemas loads it under plain Node for scripts/contract-check.mjs.

/** The colours a group can take, in the order the create screen shows them (the server's list). */
export const GROUP_COLOR_KEYS = ['blue', 'sage', 'pink', 'peach', 'mint'] as const;

export type GroupColor = (typeof GROUP_COLOR_KEYS)[number];

export const groupColorLabels: Record<GroupColor, string> = {
  blue: 'Blue',
  sage: 'Sage',
  pink: 'Pink',
  peach: 'Peach',
  mint: 'Mint',
};

/** "Members can see" on the create screen. The first one is what the design has selected. */
export const VISIBILITY_OPTIONS = [
  { showNotes: false, title: 'Mood only', description: 'Your mood and time, no notes' },
  { showNotes: true, title: 'Mood + notes', description: 'Also the few words you add' },
] as const;

/** "Share my check-ins here" is on when the join screen opens, as in the design. */
export const DEFAULT_AUTO_SHARE = true;

/** The design's one reaction, "Send a hug": the server's sending_love. */
export const HUG_REACTION = 'sending_love';

export const GROUP_NAME_MAX = 60;

/** Server invite codes are 6 characters; a shorter entry is never looked up. */
export const MIN_CODE_LENGTH = 6;

/** The words a post can carry (the server allows 280). */
export const POST_NOTE_MAX = 280;
