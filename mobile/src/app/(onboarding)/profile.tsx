import { ProfileSetupScreen } from '@/screens/profile-setup';

// An account without a name lands here. After saving, the session has a name and the auth gate
// moves on to the signed-in area by itself.
export default function ProfileRoute() {
  return <ProfileSetupScreen mode="setup" />;
}
