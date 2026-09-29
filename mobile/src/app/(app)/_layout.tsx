import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';

import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
import { colors } from '@/theme';

const PROMPT_ROUTES = { joy: '/joy', password: '/set-password' } as const;

export default function AppLayout() {
  const router = useRouter();
  const next = useUiStore(selectNextPrompt);

  // One-shot prompts queued by sign-in or first profile setup. Like the web (400 ms), let the
  // previous screen settle before the next one slides in; the screen removes its own prompt.
  useEffect(() => {
    if (!next) return;
    const timer = setTimeout(() => router.push(PROMPT_ROUTES[next]), 400);
    return () => clearTimeout(timer);
  }, [next, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="joy" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="set-password"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.62, 1],
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
