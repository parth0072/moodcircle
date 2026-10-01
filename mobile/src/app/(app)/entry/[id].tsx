import { useLocalSearchParams, useRouter } from 'expo-router';

import { EntryScreen } from '@/screens/entry';

export default function EntryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EntryScreen
      entryId={id}
      onBack={() => router.back()}
      onEdit={(entryId) => router.push({ pathname: '/write-entry', params: { id: entryId } })}
      onShare={(entryId) => router.push({ pathname: '/share-entry/[id]', params: { id: entryId } })}
    />
  );
}
