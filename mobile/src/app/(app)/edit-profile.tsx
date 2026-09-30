import { useRouter } from 'expo-router';

import { ProfileSetupScreen } from '@/screens/profile-setup';

export default function EditProfileRoute() {
  const router = useRouter();
  return (
    <ProfileSetupScreen mode="edit" onBack={() => router.back()} onSaved={() => router.back()} />
  );
}
