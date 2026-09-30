// Query keys for everything about groups. They start with the resource name so one invalidation
// refreshes every screen that shows a group. Kept apart from the hooks so the entries hooks can
// refresh groups too (a journal entry can be shared automatically) without importing the API.
export const groupKeys = {
  all: ['groups'] as const,
  overview: () => [...groupKeys.all, 'overview'] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
  feed: (id: string) => [...groupKeys.all, 'feed', id] as const,
  preview: (code: string) => [...groupKeys.all, 'preview', code] as const,
};
