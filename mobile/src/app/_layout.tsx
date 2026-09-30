import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { queryClient, setupQueryLifecycle } from '@/api/query-client';
import { usePrefsStore } from '@/stores/prefs-store';
import { selectStatus, useSessionStore } from '@/stores/session-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const status = useSessionStore(selectStatus);
  const prefsHydrated = usePrefsStore((s) => s.hydrated);

  useEffect(() => {
    void useSessionStore.getState().hydrate();
    void usePrefsStore.getState().hydrate();
    return setupQueryLifecycle();
  }, []);

  // A font that fails to load must not leave the app on the splash screen forever.
  const ready = (fontsLoaded || fontError !== null) && status !== 'loading' && prefsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Deciding a route from unhydrated state flashes the wrong screen and misroutes deep links.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'needsProfile'}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
