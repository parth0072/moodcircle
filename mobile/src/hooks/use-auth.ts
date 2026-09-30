import { useMutation } from '@tanstack/react-query';

import { passwordLogin, requestOtp, setPassword, verifyOtp } from '@/api/auth';
import { updateProfile } from '@/api/profile';
import { mergeUserFields, type User } from '@/api/schemas/user';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';

/** Which screen asked for the code: a new account, or "Forgot password?". */
export type VerifyFlow = 'signup' | 'forgot';

const EXISTING_ACCOUNT_NOTICE =
  'You already had an account, so we signed you in. Your password is unchanged.';

interface Verified {
  token: string;
  user: User;
  /** Ask for a password after sign-in: it could not be saved, or the user forgot theirs. */
  passwordPrompt: boolean;
  notice: string | null;
}

/** Emails a one-time code. Also used by "Resend". */
export function useRequestOtp() {
  return useMutation({ mutationFn: (email: string) => requestOtp(email) });
}

/**
 * A new account is created by confirming the code, so the name and password typed on the sign-up
 * form are saved right after, with the fresh token and before the session starts: the app never
 * flashes a "what is your name?" screen. An email that already has an account is just signed in
 * and its name and password are left alone. Each save can fail without losing the sign-in: a
 * missing name is asked for again by the profile screen, a missing password by the password sheet.
 */
async function completeSignUp(token: string, user: User): Promise<Verified> {
  const draft = useUiStore.getState().signupDraft;
  const isNew = !user.name && !user.hasPassword;
  if (!draft || !isNew) {
    return {
      token,
      user,
      passwordPrompt: false,
      notice: draft && !isNew ? EXISTING_ACCOUNT_NOTICE : null,
    };
  }

  let next = user;
  try {
    next = mergeUserFields(next, await updateProfile({ name: draft.name }, token));
  } catch {
    // The profile screen asks for the name again.
  }
  let passwordPrompt = false;
  try {
    await setPassword(draft.password, token);
    next = { ...next, hasPassword: true };
  } catch {
    passwordPrompt = true;
  }
  return { token, user: next, passwordPrompt, notice: null };
}

/** Confirms the emailed code and signs in (see completeSignUp for what a new account also saves). */
export function useVerifyOtp(flow: VerifyFlow = 'signup') {
  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }): Promise<Verified> => {
      const { token, user } = await verifyOtp(email, otp);
      if (flow === 'signup') return completeSignUp(token, user);
      return { token, user, passwordPrompt: true, notice: null };
    },
    onSuccess: async ({ token, user, passwordPrompt, notice }) => {
      const ui = useUiStore.getState();
      // Queue before signing in so the signed-in area finds it on its first render.
      if (passwordPrompt) ui.enqueuePrompt('password');
      if (notice) ui.setNotice(notice);
      ui.clearSignupDraft();
      await useSessionStore.getState().signIn(token, user);
    },
  });
}

export function usePasswordLogin() {
  return useMutation({
    mutationFn: ({
      email,
      password,
    }: {
      email: string;
      password: string;
      /** "Remember me": false keeps the session in memory, so the next launch starts signed out. */
      remember: boolean;
    }) => passwordLogin(email, password),
    onSuccess: ({ token, user }, { remember }) =>
      useSessionStore.getState().signIn(token, user, { remember }),
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (password: string) => setPassword(password),
    onSuccess: () => useSessionStore.getState().mergeUser({ hasPassword: true }),
  });
}
