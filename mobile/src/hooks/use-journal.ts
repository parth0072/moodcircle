import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  addJournalReply,
  createJournalEntry,
  deleteJournalEntry,
  deleteJournalReply,
  getJournalEntry,
  listJournal,
  listSharePeople,
  setJournalLove,
  setJournalShares,
  updateJournalEntry,
  type JournalEntryChanges,
  type JournalFilter,
  type NewJournalEntry,
  type ShareRequest,
} from '@/api/journal';

import { journalKeys } from './journal-keys';

// People write, share, love and reply while a screen is closed, so the journal is never treated as
// fresh (the app's default is 30 seconds): opening a screen, or coming back to the app, fetches again
// and shows what it already has in the meantime.
const ALWAYS_REFETCH = { staleTime: 0 } as const;

/** The person's entries and the ones shared with them, newest first; `fetchNextPage` loads older ones. */
export function useJournalList(filter: JournalFilter) {
  return useInfiniteQuery({
    queryKey: journalKeys.list(filter),
    queryFn: ({ pageParam }) => listJournal(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    // Typing a search or switching the filter keeps the old list on screen until the new one arrives.
    placeholderData: keepPreviousData,
    ...ALWAYS_REFETCH,
  });
}

/** One entry in full, with its replies. `id` may be empty while a screen is still deciding what to show. */
export function useJournalEntry(id: string | undefined) {
  return useQuery({
    queryKey: journalKeys.entry(id ?? ''),
    queryFn: () => getJournalEntry(id ?? ''),
    enabled: !!id,
    ...ALWAYS_REFETCH,
  });
}

/** Who an entry can be sent to. */
export function useSharePeople() {
  return useQuery({ queryKey: journalKeys.people(), queryFn: listSharePeople, ...ALWAYS_REFETCH });
}

/** Anything that changes an entry can change the list, the open entry and who it is shared with. */
function useRefreshJournal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: journalKeys.all });
}

export function useCreateJournalEntry() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: (entry: NewJournalEntry) => createJournalEntry(entry),
    onSuccess: refresh,
  });
}

export function useUpdateJournalEntry() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: JournalEntryChanges }) =>
      updateJournalEntry(id, changes),
    onSuccess: refresh,
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJournalEntry(id),
    // Everything else about the journal is refreshed; the entry that was just deleted is not,
    // because the page showing it is still open underneath and would only be told "not found".
    onSuccess: (_deleted, id) =>
      queryClient.invalidateQueries({
        queryKey: journalKeys.all,
        predicate: (query) => !(query.queryKey[1] === 'entry' && query.queryKey[2] === id),
      }),
  });
}

/** The entry ends up shared with exactly the people in `recipientIds` (none stops sharing). */
export function useSetJournalShares() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: ({ id, ...request }: ShareRequest & { id: string }) =>
      setJournalShares(id, request),
    onSuccess: refresh,
  });
}

export function useSetJournalLove() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setJournalLove(id, on),
    onSuccess: refresh,
  });
}

export function useAddJournalReply() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addJournalReply(id, body),
    onSuccess: refresh,
  });
}

export function useDeleteJournalReply() {
  const refresh = useRefreshJournal();
  return useMutation({
    mutationFn: ({ id, replyId }: { id: string; replyId: string }) =>
      deleteJournalReply(id, replyId),
    onSuccess: refresh,
  });
}
