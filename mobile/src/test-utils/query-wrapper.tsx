import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Fresh QueryClient per test. No retries, so a failed mutation settles immediately; infinite
 * gcTime, so the cache schedules no garbage-collection timers that would keep Jest workers alive
 * (a default 5 minute timer makes a test run hang for five minutes after it finishes).
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function createQueryWrapper(client: QueryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
