import { useRouter } from 'expo-router';

import { JoinGroupScreen } from '@/screens/join-group';

export default function JoinGroupRoute() {
  const router = useRouter();
  return (
    <JoinGroupScreen
      onBack={() => router.back()}
      onJoined={(id) => router.replace({ pathname: '/group/[id]', params: { id } })}
    />
  );
}
