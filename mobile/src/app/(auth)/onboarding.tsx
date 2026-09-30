import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/screens/onboarding';
import { usePrefsStore } from '@/stores/prefs-store';

export default function OnboardingRoute() {
  const router = useRouter();
  return (
    <OnboardingScreen
      onStart={() => {
        void usePrefsStore.getState().markOnboardingSeen();
        router.replace('/welcome');
      }}
    />
  );
}
