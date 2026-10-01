import type { EntryType } from '@/constants/journal';

// Query keys for everything about the journal. They start with the resource name so one
// invalidation refreshes the list, the open entry and the people to share with.
export const journalKeys = {
  all: ['journal'] as const,
  list: (filter: { type?: EntryType; q?: string }) => [...journalKeys.all, 'list', filter] as const,
  entry: (id: string) => [...journalKeys.all, 'entry', id] as const,
  people: () => [...journalKeys.all, 'people'] as const,
};
