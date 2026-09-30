import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isReminderOn, turnReminderOff, turnReminderOn } from '@/utils/reminder';

const reminderKey = ['reminder'] as const;

/** Whether the daily reminder is on (a setting of this device, kept in secure storage). */
export function useReminder() {
  return useQuery({ queryKey: reminderKey, queryFn: isReminderOn });
}

/** Turns the reminder on or off. Its result is 'denied' when the user refuses notifications. */
export function useSetReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      if (on) return turnReminderOn();
      await turnReminderOff();
      return 'off' as const;
    },
    onSuccess: (result) => queryClient.setQueryData(reminderKey, result === 'on'),
  });
}
