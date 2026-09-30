import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';

import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
import { colors } from '@/theme';

const PROMPT_ROUTES = { password: '/set-password' } as const;

export default function AppLayout() {
  const router = useRouter();
  const next = useUiStore(selectNextPrompt);

  // One-shot prompts queued by sign-in ("Forgot password?", or a password that could not be saved
  // at sign-up). Let the first screen settle (400 ms) before the sheet slides in; the sheet removes
  // its own prompt.
  useEffect(() => {
    if (!next) return;
    const timer = setTimeout(() => router.push(PROMPT_ROUTES[next]), 400);
    return () => clearTimeout(timer);
  }, [next, router]);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen
        name="set-password"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.62, 1],
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack>
  );
}
