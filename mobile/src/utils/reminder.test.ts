import * as Notifications from 'expo-notifications';

import { isReminderOn, turnReminderOff, turnReminderOn } from './reminder';

const mockMemory = new Map<string, string>();
jest.mock('./secure-storage', () => ({
  secureStorage: {
    get: async (key: string) => mockMemory.get(key) ?? null,
    set: async (key: string, value: string) => void mockMemory.set(key, value),
    remove: async (key: string) => void mockMemory.delete(key),
  },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

const n = jest.mocked(Notifications);

beforeEach(() => {
  mockMemory.clear();
  for (const fn of [
    n.getPermissionsAsync,
    n.requestPermissionsAsync,
    n.scheduleNotificationAsync,
    n.cancelScheduledNotificationAsync,
  ]) {
    (fn as jest.Mock).mockReset();
  }
  n.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

describe('daily reminder', () => {
  it('is off until turned on', async () => {
    expect(await isReminderOn()).toBe(false);
  });

  it('asks for permission, schedules 8:30 pm every day, and remembers it', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    n.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    expect(await turnReminderOn()).toBe('on');
    expect(n.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'daily-check-in',
        trigger: { type: 'daily', hour: 20, minute: 30 },
      }),
    );
    expect(await isReminderOn()).toBe(true);
  });

  it('does not ask again when permission is already granted', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await turnReminderOn();
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('stays off and schedules nothing when permission is refused', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    n.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);

    expect(await turnReminderOn()).toBe('denied');
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await isReminderOn()).toBe(false);
  });

  it('replaces its own schedule instead of adding a second one', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await turnReminderOn();
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-check-in');
  });

  it('turns off by cancelling the schedule and forgetting it', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await turnReminderOn();
    await turnReminderOff();
    expect(n.cancelScheduledNotificationAsync).toHaveBeenLastCalledWith('daily-check-in');
    expect(await isReminderOn()).toBe(false);
  });
});
