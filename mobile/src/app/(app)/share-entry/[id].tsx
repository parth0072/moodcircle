import { useLocalSearchParams, useRouter } from 'expo-router';

import { ShareEntryScreen } from '@/screens/share-entry';

export default function ShareEntryRoute() {
  const router = useRouter();
  // `then=entry`: the writing screen was replaced by this one, so finishing goes on to the entry.
  const { id, then } = useLocalSearchParams<{ id: string; then?: string }>();
  return (
    <ShareEntryScreen
      entryId={id}
      onBack={() => router.back()}
      onDone={() =>
        then === 'entry'
          ? router.replace({ pathname: '/entry/[id]', params: { id } })
          : router.back()
      }
    />
  );
}
