import { usePrefsStore } from './prefs-store';

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

beforeEach(() => {
  mockMemory.clear();
  mockFailing.get = false;
  usePrefsStore.setState({ hydrated: false, onboardingSeen: false });
});

describe('prefs store', () => {
  it('starts with the intro unseen once storage was read and holds nothing', async () => {
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState()).toMatchObject({ hydrated: true, onboardingSeen: false });
  });

  it('remembers that the intro was seen across a relaunch', async () => {
    await usePrefsStore.getState().markOnboardingSeen();
    usePrefsStore.setState({ hydrated: false, onboardingSeen: false });
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState()).toMatchObject({ hydrated: true, onboardingSeen: true });
  });

  it('does not block the app when storage cannot be read', async () => {
    mockFailing.get = true;
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState()).toMatchObject({ hydrated: true, onboardingSeen: false });
  });
});
