import { create } from 'zustand';

import { isProfileComplete, type User } from '@/api/schemas/user';
import { secureStorage } from '@/utils/secure-storage';

const TOKEN_KEY = 'mc.token';
const USER_KEY = 'mc.user';

export type SessionStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface SessionState {
  /** False until persisted storage has been read. Render nothing (splash) until it is true. */
  hydrated: boolean;
  token: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  /** Profile responses omit email/hasPassword: merge, never replace. */
  mergeUser: (patch: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  hydrated: false,
  token: null,
  user: null,

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
      set({ token: user ? token : null, user, hydrated: true });
    } catch {
      // Unreadable storage must not brick the app. Start signed out, leave storage untouched.
      set({ token: null, user: null, hydrated: true });
    }
  },

  async signIn(token, user) {
    set({ token, user, hydrated: true });
    await persist(token, user);
  },

  async mergeUser(patch) {
    const { token, user } = get();
    if (!token || !user) return;
    // `undefined` means "not in the answer", never "clear it": a profile response has no email.
    const provided = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    const next = { ...user, ...provided };
    set({ user: next });
    await persist(token, next);
  },

  async signOut() {
    set({ token: null, user: null });
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
