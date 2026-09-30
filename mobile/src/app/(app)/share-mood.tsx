import { useLocalSearchParams, useRouter } from 'expo-router';

import { ShareMoodScreen } from '@/screens/share-mood';

export default function ShareMoodRoute() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return (
    <ShareMoodScreen
      initialGroupId={groupId}
      onClose={() => router.back()}
      onDone={() => router.back()}
    />
  );
}
