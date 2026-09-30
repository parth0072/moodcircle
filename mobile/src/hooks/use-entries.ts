import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEntry,
  deleteEntry,
  getEntryStats,
  listEntries,
  updateEntry,
  type EntryPatch,
  type NewEntry,
} from '@/api/entries';

import { groupKeys } from './group-keys';

// Keys start with the resource name so one invalidation refreshes every screen that shows entries.
export const entryKeys = {
  all: ['entries'] as const,
  range: (from: string, to: string) => [...entryKeys.all, 'range', from, to] as const,
  stats: (today: string) => [...entryKeys.all, 'stats', today] as const,
};

/** Entries from `from` to `to`, local days, oldest first. */
export function useEntries(from: string, to: string) {
  return useQuery({ queryKey: entryKeys.range(from, to), queryFn: () => listEntries(from, to) });
}

/** Check-ins, streak, top emotion and first day, for the profile. */
export function useEntryStats(today: string) {
  return useQuery({ queryKey: entryKeys.stats(today), queryFn: () => getEntryStats(today) });
}

/**
 * Any change to entries can change the day list, the insights and the stats: refresh them all.
 * It can also change a group: the server shares the day's mood with the groups the person chose.
 */
function useRefreshEntries() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: entryKeys.all }),
      queryClient.invalidateQueries({ queryKey: groupKeys.all }),
    ]);
}

export function useCreateEntry() {
  const refresh = useRefreshEntries();
  return useMutation({ mutationFn: (entry: NewEntry) => createEntry(entry), onSuccess: refresh });
}

export function useUpdateEntry() {
  const refresh = useRefreshEntries();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntryPatch }) => updateEntry(id, patch),
    onSuccess: refresh,
  });
}

export function useDeleteEntry() {
  const refresh = useRefreshEntries();
  return useMutation({ mutationFn: (id: string) => deleteEntry(id), onSuccess: refresh });
}
