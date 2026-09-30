import { endSession } from '@/api';
import { turnReminderOff } from '@/utils/reminder';

/**
 * Log out: cancel this device's daily reminder (it belongs to the person leaving), then end the
 * session everywhere: memory, storage and every cached query. Never throws, so a screen can call it
 * without a try block.
 */
export function useSignOut() {
  return async () => {
    await turnReminderOff().catch(() => undefined);
    await endSession();
  };
}
