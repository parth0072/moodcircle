import type {
  JournalEntry,
  JournalEntryDetail,
  JournalPhoto,
  SharePerson,
} from '@/api/schemas/journal';

// Builders for the journal screens' tests: a plausible entry, and overrides for what a test cares about.

export const photo = (id: string): JournalPhoto => ({
  id,
  url: `https://api.test/api/journal/photos/${id}/file?e=1&s=abc`,
  width: 4032,
  height: 3024,
});

/** Built from local parts, so a test reads the same in any time zone. */
export const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(new Date().getFullYear(), month - 1, day, hour, minute).toISOString();

export const journalEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'e1',
  type: 'note',
  emotion: 'sad',
  title: 'Couldn’t sleep again',
  excerpt: 'Kept replaying the meeting. I think I’m more tired than upset.',
  createdAt: at(1, 10, 23, 20),
  updatedAt: at(1, 10, 23, 20),
  isMine: true,
  owner: { id: 'me', name: 'Aria' },
  photos: [],
  photoCount: 0,
  sharedWith: [],
  sharedMessage: null,
  loves: { count: 0, mine: false },
  replyCount: 0,
  ...overrides,
});

export const journalDetail = (overrides: Partial<JournalEntryDetail> = {}): JournalEntryDetail => ({
  ...journalEntry(),
  body: 'Kept replaying the meeting. I think I’m more tired than upset. Tomorrow I’ll rest.',
  replies: [],
  ...overrides,
});

export const sharePerson = (overrides: Partial<SharePerson> = {}): SharePerson => ({
  id: 'u-kabir',
  name: 'Kabir',
  username: null,
  avatar: null,
  groups: [{ id: 'g1', name: 'Sunday Circle' }],
  ...overrides,
});
