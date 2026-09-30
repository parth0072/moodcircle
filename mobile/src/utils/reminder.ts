import * as Notifications from 'expo-notifications';

import { secureStorage } from './secure-storage';

const KEY = 'mc.reminder';
const IDENTIFIER = 'daily-check-in';
const CHANNEL_ID = 'daily-check-in';

/** The design's reminder is fixed at 8:30 pm; there is no time picker to change it. */
export const REMINDER_HOUR = 20;
export const REMINDER_MINUTE = 30;
export const REMINDER_LABEL = 'Every day at 8:30 pm';

export type ReminderResult = 'on' | 'denied';

/**
 * Android shows a notification only through a channel, and from Android 13 it asks for permission
 * only once a channel exists, so this comes before asking. iOS has no channels: nothing to do.
 */
async function ensureChannel(): Promise<void> {
  if (process.env.EXPO_OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function isReminderOn(): Promise<boolean> {
  return (await secureStorage.get(KEY)) === '1';
}

/**
 * Schedules the daily local notification, asking for permission first. A refusal leaves the
 * reminder off and reports 'denied' so the screen can say where to change it. Turning it on twice
 * never schedules two: the same identifier is replaced.
 */
export async function turnReminderOn(): Promise<ReminderResult> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';

  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: IDENTIFIER,
    content: { title: 'Moodbloom', body: 'How did today feel?' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
      channelId: CHANNEL_ID, // only used on Android
    },
  });
  await secureStorage.set(KEY, '1');
  return 'on';
}

export async function turnReminderOff(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => undefined);
  await secureStorage.remove(KEY);
}
