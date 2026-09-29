import { create } from 'zustand';

/**
 * One-shot prompts to show after sign-in, in priority order. Not persisted on purpose: they are a
 * continuation of the sign-in or first profile setup that just happened, never a gate. A returning
 * user whose `joyOnboarded` is false is NOT asked at login (that hijacked logins on the web).
 */
export type Prompt = 'joy' | 'password';

const ORDER: Prompt[] = ['joy', 'password'];

interface UiState {
  prompts: Prompt[];
  enqueuePrompt: (prompt: Prompt) => void;
  dismissPrompt: (prompt: Prompt) => void;
  clearPrompts: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  prompts: [],
  enqueuePrompt: (prompt) =>
    set((s) => (s.prompts.includes(prompt) ? s : { prompts: [...s.prompts, prompt] })),
  dismissPrompt: (prompt) => set((s) => ({ prompts: s.prompts.filter((p) => p !== prompt) })),
  clearPrompts: () => set({ prompts: [] }),
}));

/** The prompt to show now: the highest-priority one that is queued. */
export function selectNextPrompt(s: Pick<UiState, 'prompts'>): Prompt | null {
  return ORDER.find((p) => s.prompts.includes(p)) ?? null;
}
