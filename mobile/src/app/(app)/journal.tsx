import { useRouter } from 'expo-router';

import { journalKeys } from '@/hooks/journal-keys';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { JournalScreen } from '@/screens/journal';

export default function JournalRoute() {
  const router = useRouter();
  // Coming back from writing, sharing or reading an entry, the list may have moved on.
  useRefreshOnFocus(journalKeys.all);
  return (
    <JournalScreen
      onBack={() => router.back()}
      onWrite={() => router.push('/write-entry')}
      onOpen={(id) => router.push({ pathname: '/entry/[id]', params: { id } })}
    />
  );
}
