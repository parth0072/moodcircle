import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { SetPasswordScreen } from '@/screens/set-password';
import { useUiStore } from '@/stores/ui-store';

export default function SetPasswordRoute() {
  const router = useRouter();

  // Swiping the sheet away also counts as answering the prompt.
  useEffect(() => () => useUiStore.getState().dismissPrompt('password'), []);

  return <SetPasswordScreen onDone={() => router.back()} />;
}
