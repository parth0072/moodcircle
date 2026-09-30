import { api } from '@/api';

import { parseResponse } from './parse';
import { authResponse, otpRequestResponse, setPasswordResponse } from './schemas/auth';

// Sign-in calls send `auth: false`: a 401 from them means "wrong credentials", never "session expired".

/**
 * Asks the backend to email a one-time code. The response schema deliberately omits the dev-only
 * `otp` field the backend echoes outside production, so zod strips it and no screen can read it.
 */
export async function requestOtp(email: string) {
  const data = await api.post<unknown>('/auth/otp/request', { email }, { auth: false });
  return parseResponse(otpRequestResponse, data);
}

/** `otp` must be a string of digits: the backend compares it strictly. */
export async function verifyOtp(email: string, otp: string) {
  const data = await api.post<unknown>('/auth/otp/verify', { email, otp }, { auth: false });
  return parseResponse(authResponse, data);
}

export async function passwordLogin(email: string, password: string) {
  const data = await api.post<unknown>(
    '/auth/password/login',
    { email, password },
    { auth: false },
  );
  return parseResponse(authResponse, data);
}

/** Needs a token: the session's, or `token` right after a code was confirmed and before sign-in. */
export async function setPassword(password: string, token?: string) {
  const data = token
    ? await api.post<unknown>('/auth/password/set', { password }, { token })
    : await api.post<unknown>('/auth/password/set', { password });
  return parseResponse(setPasswordResponse, data);
}
