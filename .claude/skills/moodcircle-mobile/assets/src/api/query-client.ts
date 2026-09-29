import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

import { isRetryable } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only what "try again" can fix (see isRetryable), and not forever. 4xx answers and
      // unexpected errors are final.
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
    },
    mutations: { retry: false },
  },
});

/** Call once from the root layout. React Native has no window focus or navigator.onLine. */
export function setupQueryLifecycle(): () => void {
  const appState = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => setOnline(!!state.isConnected));
    return () => subscription.remove();
  });
  return () => appState.remove();
}
