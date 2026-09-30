import { api } from '@/api';

import { parseResponse } from './parse';
import { profileResponse } from './schemas/auth';

export interface ProfileUpdate {
  name?: string;
  username?: string;
  avatar?: string;
}

/**
 * The response carries no `email` or `hasPassword`: merge it into the session user
 * (`useSessionStore.mergeUser`), never replace the stored user with it. `token` is for the moment
 * right after a code was confirmed and before sign-in.
 */
export async function updateProfile(patch: ProfileUpdate, token?: string) {
  const data = token
    ? await api.patch<unknown>('/profile', patch, { token })
    : await api.patch<unknown>('/profile', patch);
  return parseResponse(profileResponse, data).user;
}
