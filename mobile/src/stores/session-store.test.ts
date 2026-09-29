import type { User } from '@/api/schemas/user';

import { selectStatus, useSessionStore } from './session-store';

const mockMemory = new Map<string, string>();
const mockFailing = { get: false };

jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async (key: string) => {
      if (mockFailing.get) throw new Error('keychain unavailable');
      return mockMemory.get(key) ?? null;
    },
    set: async (key: string, value: string) => void mockMemory.set(key, value),
    remove: async (key: string) => void mockMemory.delete(key),
  },
}));

const complete: User = {
  id: 'u1',
  email: 'a@b.co',
  name: 'Asha',
  username: 'asha',
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: ['walk'],
  joyOnboarded: true,
};

beforeEach(() => {
  mockMemory.clear();
  mockFailing.get = false;
  useSessionStore.setState({ hydrated: false, token: null, user: null });
});

describe('session store', () => {
  it('is loading until hydrated, then signed out when nothing is stored', async () => {
    expect(selectStatus(useSessionStore.getState())).toBe('loading');
    await useSessionStore.getState().hydrate();
    expect(selectStatus(useSessionStore.getState())).toBe('signedOut');
  });

  it('restores a stored session across a cold start', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    useSessionStore.setState({ hydrated: false, token: null, user: null }); // simulate relaunch
    await useSessionStore.getState().hydrate();
    const s = useSessionStore.getState();
    expect(s.token).toBe('tok');
    expect(s.user).toEqual(complete);
    expect(selectStatus(s)).toBe('ready');
  });

  it('routes a new account to profile setup', async () => {
    await useSessionStore
      .getState()
      .signIn('tok', { ...complete, name: null, username: null, joyOnboarded: false });
    expect(selectStatus(useSessionStore.getState())).toBe('needsProfile');
  });

  it('treats a named account without a username as ready (username is optional)', async () => {
    await useSessionStore.getState().signIn('tok', { ...complete, username: null });
    expect(selectStatus(useSessionStore.getState())).toBe('ready');
  });

  it('does NOT require joy onboarding for an existing account (the login-hijack bug)', async () => {
    await useSessionStore
      .getState()
      .signIn('tok', { ...complete, joyActivities: [], joyOnboarded: false });
    expect(selectStatus(useSessionStore.getState())).toBe('ready');
  });

  it('merges a profile response without dropping email or hasPassword', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    await useSessionStore.getState().mergeUser({ name: 'Asha K', joyActivities: ['walk', 'tea'] });
    const user = useSessionStore.getState().user;
    expect(user).toMatchObject({
      email: 'a@b.co',
      hasPassword: true,
      name: 'Asha K',
      joyActivities: ['walk', 'tea'],
    });
    expect(JSON.parse(mockMemory.get('mc.user') ?? '{}')).toMatchObject({
      email: 'a@b.co',
      name: 'Asha K',
    });
  });

  it('treats undefined fields in a patch as absent, so a profile answer cannot wipe the email', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    await useSessionStore
      .getState()
      .mergeUser({ name: 'Asha K', email: undefined, hasPassword: undefined });
    expect(useSessionStore.getState().user).toMatchObject({
      name: 'Asha K',
      email: 'a@b.co',
      hasPassword: true,
    });
  });

  it('still lets a patch set a field to null', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    await useSessionStore.getState().mergeUser({ avatar: null });
    expect(useSessionStore.getState().user?.avatar).toBeNull();
  });

  it('drops a token that has no readable user snapshot', async () => {
    mockMemory.set('mc.token', 'tok');
    mockMemory.set('mc.user', '{not json');
    await useSessionStore.getState().hydrate();
    expect(selectStatus(useSessionStore.getState())).toBe('signedOut');
    expect(mockMemory.has('mc.token')).toBe(false);
  });

  it('starts signed out, without wiping storage, when storage cannot be read', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    useSessionStore.setState({ hydrated: false, token: null, user: null });
    mockFailing.get = true;
    await useSessionStore.getState().hydrate();
    expect(selectStatus(useSessionStore.getState())).toBe('signedOut');
    expect(mockMemory.get('mc.token')).toBe('tok');
  });

  it('clears mockMemory and storage on sign out', async () => {
    await useSessionStore.getState().signIn('tok', complete);
    await useSessionStore.getState().signOut();
    expect(useSessionStore.getState()).toMatchObject({ token: null, user: null });
    expect(mockMemory.size).toBe(0);
  });
});
