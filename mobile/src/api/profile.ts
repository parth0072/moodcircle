import { api } from '@/api';

import { parseResponse } from './parse';
import { profileResponse } from './schemas/auth';

export interface ProfileUpdate {
  name?: string;
  username?: string;
  avatar?: string;
  joyActivities?: string[];
}

/**
 * The response carries no `email` or `hasPassword`: merge it into the session user
 * (`useSessionStore.mergeUser`), never replace the stored user with it.
 */
export async function updateProfile(patch: ProfileUpdate) {
  const data = await api.patch<unknown>('/profile', patch);
  return parseResponse(profileResponse, data).user;
}
