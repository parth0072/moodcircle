import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Refreshes a query each time its screen comes back into view after being covered by another one
 * (a stack keeps the screen underneath mounted, so it would otherwise keep showing what it had).
 * The first time the screen appears is skipped: opening it already fetches.
 */
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void queryClient.invalidateQueries({ queryKey });
      seen.current = true;
    }, [queryClient, queryKey]),
  );
}
