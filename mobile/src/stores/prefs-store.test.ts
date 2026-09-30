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
  usePrefsStore.setState({ hydrated: false, onboardingSeen: false, groupSeen: {} });
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
  it('remembers the newest post looked at in each group across a relaunch', async () => {
    await usePrefsStore.getState().markGroupSeen('g1', '2026-09-30T08:00:00.000Z');
    await usePrefsStore.getState().markGroupSeen('g2', '2026-09-30T09:00:00.000Z');
    usePrefsStore.setState({ hydrated: false, groupSeen: {} });
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().groupSeen).toEqual({
      g1: '2026-09-30T08:00:00.000Z',
      g2: '2026-09-30T09:00:00.000Z',
    });
  });

  it("never moves a group's seen time backwards", async () => {
    await usePrefsStore.getState().markGroupSeen('g1', '2026-09-30T09:00:00.000Z');
    await usePrefsStore.getState().markGroupSeen('g1', '2026-09-30T08:00:00.000Z');
    expect(usePrefsStore.getState().groupSeen.g1).toBe('2026-09-30T09:00:00.000Z');
  });

  it('keeps only the newest 30 groups', async () => {
    for (let i = 0; i < 32; i++) {
      await usePrefsStore
        .getState()
        .markGroupSeen(`g${i}`, `2026-09-30T08:${String(i).padStart(2, '0')}:00.000Z`);
    }
    const seen = usePrefsStore.getState().groupSeen;
    expect(Object.keys(seen)).toHaveLength(30);
    expect(seen.g0).toBeUndefined();
    expect(seen.g31).toBeDefined();
  });

  it('ignores stored group data that is not a map of times', async () => {
    mockMemory.set('mc.groupSeen', '[1,2,3]');
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().groupSeen).toEqual({});
    mockMemory.set('mc.groupSeen', 'not json');
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().groupSeen).toEqual({});
  });
});
