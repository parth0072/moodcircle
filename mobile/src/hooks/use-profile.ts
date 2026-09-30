import { useMutation } from '@tanstack/react-query';

import { updateProfile, type ProfileUpdate } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';

/** Saves profile fields and merges the answer into the session user (it omits email and hasPassword). */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(patch),
    onSuccess: (user) => useSessionStore.getState().mergeUser(user),
  });
}
