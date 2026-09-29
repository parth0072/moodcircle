import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { SetPasswordScreen } from '@/screens/set-password';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';

export default function SetPasswordRoute() {
  const router = useRouter();
  // Decided once, on open: after saving, hasPassword flips and the title must not change mid-close.
  const [firstTime] = useState(() => !useSessionStore.getState().user?.hasPassword);

  // Swiping the sheet away also counts as answering the prompt.
  useEffect(() => () => useUiStore.getState().dismissPrompt('password'), []);

  return <SetPasswordScreen firstTime={firstTime} onDone={() => router.back()} />;
}
