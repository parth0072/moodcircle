import { useRouter } from 'expo-router';

import { HomeScreen } from '@/screens/home';

export default function HomeRoute() {
  const router = useRouter();
  return (
    <HomeScreen
      onOpenProfile={() => router.push('/profile')}
      onOpenGroups={() => router.push('/groups')}
      onOpenInsights={() => router.push('/insights')}
      onOpenLog={(entryId) => router.push({ pathname: '/log', params: entryId ? { entryId } : {} })}
    />
  );
}
