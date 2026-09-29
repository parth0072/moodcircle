import { useMutation } from '@tanstack/react-query';

import { passwordLogin, requestOtp, setPassword, verifyOtp } from '@/api/auth';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';

/** Emails a one-time code. Also used by "Resend". */
export function useRequestOtp() {
  return useMutation({ mutationFn: (email: string) => requestOtp(email) });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) => verifyOtp(email, otp),
    onSuccess: async ({ token, user }) => {
      // Queue before signing in so the signed-in area finds it on its first render.
      if (!user.hasPassword) useUiStore.getState().enqueuePrompt('password');
      await useSessionStore.getState().signIn(token, user);
    },
  });
}

export function usePasswordLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      passwordLogin(email, password),
    onSuccess: ({ token, user }) => useSessionStore.getState().signIn(token, user),
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (password: string) => setPassword(password),
    onSuccess: () => useSessionStore.getState().mergeUser({ hasPassword: true }),
  });
}
