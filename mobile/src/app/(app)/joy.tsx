import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { JoySetupScreen } from '@/screens/joy-setup';
import { useUiStore } from '@/stores/ui-store';

export default function JoyRoute() {
  const router = useRouter();

  // Swiping the modal away also counts as answering the prompt.
  useEffect(() => () => useUiStore.getState().dismissPrompt('joy'), []);

  return <JoySetupScreen onDone={() => router.back()} />;
}
