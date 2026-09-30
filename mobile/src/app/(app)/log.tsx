import { useLocalSearchParams, useRouter } from 'expo-router';

import { LogMoodScreen } from '@/screens/log-mood';

export default function LogRoute() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  return (
    <LogMoodScreen
      entryId={entryId}
      onBack={() => router.back()}
      // After saving, land on the insights; back from there returns to Home, not to this form.
      onSaved={() => router.replace('/insights')}
    />
  );
}
