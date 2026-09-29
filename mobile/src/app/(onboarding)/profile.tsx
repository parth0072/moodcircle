import { ProfileSetupScreen } from '@/screens/profile-setup';

// After a first save the session has a name, the auth gate moves on, and the queued one-time
// prompts (joy, then password) are shown by the signed-in area.
export default function ProfileRoute() {
  return <ProfileSetupScreen firstSetup />;
}
