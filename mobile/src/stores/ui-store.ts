import { create } from 'zustand';

/**
 * One-shot prompts to show after sign-in. 'password' opens the set-password sheet: after a
 * "Forgot password?" sign-in, or when saving the password chosen at sign-up failed. Not persisted
 * on purpose: they are a continuation of the sign-in that just happened, never a gate.
 */
export type Prompt = 'password';

/** What the sign-up form collected. The server only takes it after the emailed code is confirmed. */
export interface SignupDraft {
  name: string;
  password: string;
}

interface UiState {
  prompts: Prompt[];
  /** In memory only, between the sign-up form and the code screen: never persisted, never in a URL. */
  signupDraft: SignupDraft | null;
  /** A one-line message for the signed-in area, shown once (for example "You already have an account"). */
  notice: string | null;
  enqueuePrompt: (prompt: Prompt) => void;
  dismissPrompt: (prompt: Prompt) => void;
  setSignupDraft: (draft: SignupDraft) => void;
  clearSignupDraft: () => void;
  setNotice: (notice: string) => void;
  clearNotice: () => void;
  /** Everything at once, as on sign-out: nothing of one user may carry over to the next. */
  reset: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  prompts: [],
  signupDraft: null,
  notice: null,
  enqueuePrompt: (prompt) =>
    set((s) => (s.prompts.includes(prompt) ? s : { prompts: [...s.prompts, prompt] })),
  dismissPrompt: (prompt) => set((s) => ({ prompts: s.prompts.filter((p) => p !== prompt) })),
  setSignupDraft: (signupDraft) => set({ signupDraft }),
  clearSignupDraft: () => set({ signupDraft: null }),
  setNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
  reset: () => set({ prompts: [], signupDraft: null, notice: null }),
}));

/** The prompt to show now, if any. */
export function selectNextPrompt(s: Pick<UiState, 'prompts'>): Prompt | null {
  return s.prompts[0] ?? null;
}
