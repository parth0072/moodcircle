import { Stack } from 'expo-router/stack';
import { useState } from 'react';

import { usePrefsStore } from '@/stores/prefs-store';
import { colors } from '@/theme';

export default function AuthLayout() {
  // Decided once, when this group first shows (the preferences are already read by then): the
  // intro is shown until "Get started" is tapped, after that signed-out users land on the welcome screen.
  const [initialRouteName] = useState(() =>
    usePrefsStore.getState().onboardingSeen ? 'welcome' : 'onboarding',
  );
  return (
    <Stack
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
