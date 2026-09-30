import { useRouter } from 'expo-router';

import { groupKeys } from '@/hooks/group-keys';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { GroupsScreen } from '@/screens/groups';

export default function GroupsRoute() {
  const router = useRouter();
  // Coming back from a group, the counts may have moved on.
  useRefreshOnFocus(groupKeys.overview());
  return (
    <GroupsScreen
      onBack={() => router.back()}
      onJoin={() => router.push('/join-group')}
      onCreate={() => router.push('/create-group')}
      onOpenGroup={(id) => router.push({ pathname: '/group/[id]', params: { id } })}
    />
  );
}
