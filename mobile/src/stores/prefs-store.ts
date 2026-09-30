import { create } from 'zustand';

import { secureStorage } from '@/utils/secure-storage';

const ONBOARDING_KEY = 'mc.onboardingSeen';
const GROUP_SEEN_KEY = 'mc.groupSeen';
/** Group ids are never removed from the map on leaving; the oldest go once there are this many. */
const MAX_SEEN_GROUPS = 30;

interface PrefsState {
  /** False until storage has been read; the sign-in area needs it to pick its first screen. */
  hydrated: boolean;
  /** The intro screen is shown once: after "Get started", signed-out users land on the welcome screen. */
  onboardingSeen: boolean;
  /**
   * For each group, the time of the newest post the person has looked at (the server's clock).
   * Posts after it are the "new" count on the groups list.
   */
  groupSeen: Record<string, string>;
  hydrate: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  markGroupSeen: (groupId: string, newestPostAt: string) => Promise<void>;
}

/** Reads the stored map, ignoring anything that is not a map of strings. */
function parseGroupSeen(raw: string | null): Record<string, string> {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

function newest(map: Record<string, string>): Record<string, string> {
  const entries = Object.entries(map).sort((a, b) => b[1].localeCompare(a[1]));
  return Object.fromEntries(entries.slice(0, MAX_SEEN_GROUPS));
}

export const usePrefsStore = create<PrefsState>()((set, get) => ({
  hydrated: false,
  onboardingSeen: false,
  groupSeen: {},

  async hydrate() {
    try {
      const seen = (await secureStorage.get(ONBOARDING_KEY)) === '1';
      const groupSeen = parseGroupSeen(await secureStorage.get(GROUP_SEEN_KEY));
      set({ onboardingSeen: seen, groupSeen, hydrated: true });
    } catch {
      // Unreadable storage: show the intro again rather than block the app.
      set({ onboardingSeen: false, groupSeen: {}, hydrated: true });
    }
  },

  async markOnboardingSeen() {
    set({ onboardingSeen: true });
    await secureStorage.set(ONBOARDING_KEY, '1').catch(() => undefined);
  },

  async markGroupSeen(groupId, newestPostAt) {
    const current = get().groupSeen[groupId];
    if (current && current >= newestPostAt) return; // already looked at this much
    const next = newest({ ...get().groupSeen, [groupId]: newestPostAt });
    set({ groupSeen: next });
    await secureStorage.set(GROUP_SEEN_KEY, JSON.stringify(next)).catch(() => undefined);
  },
}));
