import { fetch as expoFetch } from 'expo/fetch';

import { useSessionStore } from '@/stores/session-store';
import { getApiUrl } from '@/utils/env';

import { createApiClient } from './client';
import { queryClient } from './query-client';

/** End the session everywhere: memory, storage, and every cached query of the old user. */
export async function endSession() {
  await useSessionStore.getState().signOut();
  queryClient.clear();
}

/** The app's single API client. Feature modules import this; tests import createApiClient instead. */
export const api = createApiClient({
  baseUrl: getApiUrl(),
  fetch: expoFetch,
  getToken: () => useSessionStore.getState().token,
  onUnauthorized: (rejectedToken) => {
    // A slow request that started under an old session must not sign out the new one.
    if (useSessionStore.getState().token === rejectedToken) void endSession();
  },
});
