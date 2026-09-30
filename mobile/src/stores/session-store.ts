import { create } from 'zustand';

import { isProfileComplete, mergeUserFields, type User } from '@/api/schemas/user';
import { secureStorage } from '@/utils/secure-storage';

const TOKEN_KEY = 'mc.token';
const USER_KEY = 'mc.user';

export type SessionStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface SessionState {
  /** False until persisted storage has been read. Render nothing (splash) until it is true. */
  hydrated: boolean;
  token: string | null;
  user: User | null;
  /** False for a sign-in without "Remember me": nothing is written to storage for that session. */
  persistent: boolean;
  hydrate: () => Promise<void>;
  /** `remember: false` keeps the session in memory only, so the next launch starts signed out. */
  signIn: (token: string, user: User, options?: { remember?: boolean }) => Promise<void>;
  /** Profile responses omit email/hasPassword: merge, never replace. */
  mergeUser: (patch: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  hydrated: false,
  token: null,
  user: null,
  persistent: true,

  async hydrate() {
    try {
      const [token, rawUser] = await Promise.all([
        secureStorage.get(TOKEN_KEY),
        secureStorage.get(USER_KEY),
      ]);
      // A sign-in that finished while storage was being read wins over what was stored.
      if (get().token) return set({ hydrated: true });
      const user = token && rawUser ? readUser(rawUser) : null;
      if (token && !user) {
        // A token without a readable user snapshot is not a usable session.
        await Promise.all([secureStorage.remove(TOKEN_KEY), secureStorage.remove(USER_KEY)]);
      }
      set({ token: user ? token : null, user, hydrated: true, persistent: true });
    } catch {
      // Unreadable storage must not brick the app. Start signed out, leave storage untouched.
      set({ token: null, user: null, hydrated: true });
    }
  },

  async signIn(token, user, { remember = true } = {}) {
    set({ token, user, hydrated: true, persistent: remember });
    if (remember) await persist(token, user);
    // Not remembered: also clear an older stored session, or it would come back on the next launch.
    else
      await Promise.allSettled([secureStorage.remove(TOKEN_KEY), secureStorage.remove(USER_KEY)]);
  },

  async mergeUser(patch) {
    const { token, user, persistent } = get();
    if (!token || !user) return;
    const next = mergeUserFields(user, patch);
    set({ user: next });
    if (persistent) await persist(token, next);
  },

  async signOut() {
    set({ token: null, user: null, persistent: true });
    await Promise.allSettled([secureStorage.remove(TOKEN_KEY), secureStorage.remove(USER_KEY)]);
  },
}));

export function selectStatus(s: Pick<SessionState, 'hydrated' | 'token' | 'user'>): SessionStatus {
  if (!s.hydrated) return 'loading';
  if (!s.token || !s.user) return 'signedOut';
  return isProfileComplete(s.user) ? 'ready' : 'needsProfile';
}

async function persist(token: string, user: User) {
  // In-memory state is already updated; a failed write only costs the next cold start.
  await Promise.allSettled([
    secureStorage.set(TOKEN_KEY, token),
    // Keychain values are meant to stay small (about 2 KB): the user snapshot is tiny by design.
    secureStorage.set(USER_KEY, JSON.stringify(user)),
  ]);
}

function readUser(raw: string): User | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && 'id' in value ? (value as User) : null;
  } catch {
    return null;
  }
}
