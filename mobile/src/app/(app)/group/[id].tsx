import { useLocalSearchParams, useRouter } from 'expo-router';

import { groupKeys } from '@/hooks/group-keys';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { GroupFeedScreen } from '@/screens/group-feed';

export default function GroupRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Coming back from the share screen, the new post should be there.
  useRefreshOnFocus(groupKeys.feed(id));
  return (
    <GroupFeedScreen
      groupId={id}
      onBack={() => router.back()}
      onShare={(groupId) => router.push({ pathname: '/share-mood', params: { groupId } })}
    />
  );
}
