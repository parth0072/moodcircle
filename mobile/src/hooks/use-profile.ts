import { useMutation } from '@tanstack/react-query';

import { updateProfile, type ProfileUpdate } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';

/**
 * Saves profile fields and merges the answer into the session user. `firstSetup` is true only on
 * the onboarding profile screen: it queues the one-time "things that make you feel good" prompt
 * for users who never did it.
 */
export function useUpdateProfile({ firstSetup = false }: { firstSetup?: boolean } = {}) {
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(patch),
    onSuccess: async (user) => {
      if (firstSetup && !user.joyOnboarded) useUiStore.getState().enqueuePrompt('joy');
      await useSessionStore.getState().mergeUser(user);
    },
  });
}
