import { useRouter } from 'expo-router';

import { CreateGroupScreen } from '@/screens/create-group';

export default function CreateGroupRoute() {
  const router = useRouter();
  return (
    <CreateGroupScreen
      onBack={() => router.back()}
      // The form gives way to the new group; back from there returns to the groups list.
      onCreated={(group) => router.replace({ pathname: '/group/[id]', params: { id: group.id } })}
    />
  );
}
