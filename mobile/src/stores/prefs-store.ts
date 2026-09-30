import { create } from 'zustand';

import { secureStorage } from '@/utils/secure-storage';

const ONBOARDING_KEY = 'mc.onboardingSeen';

interface PrefsState {
  /** False until storage has been read; the sign-in area needs it to pick its first screen. */
  hydrated: boolean;
  /** The intro screen is shown once: after "Get started", signed-out users land on the welcome screen. */
  onboardingSeen: boolean;
  hydrate: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>()((set) => ({
  hydrated: false,
  onboardingSeen: false,

  async hydrate() {
    try {
      const seen = (await secureStorage.get(ONBOARDING_KEY)) === '1';
      set({ onboardingSeen: seen, hydrated: true });
    } catch {
      // Unreadable storage: show the intro again rather than block the app.
      set({ onboardingSeen: false, hydrated: true });
    }
  },

  async markOnboardingSeen() {
    set({ onboardingSeen: true });
    await secureStorage.set(ONBOARDING_KEY, '1').catch(() => undefined);
  },
}));
