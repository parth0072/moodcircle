import { useRouter } from 'expo-router';

import { ProfileScreen } from '@/screens/profile';

export default function ProfileRoute() {
  const router = useRouter();
  return <ProfileScreen onBack={() => router.back()} onEdit={() => router.push('/edit-profile')} />;
}
