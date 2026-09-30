import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { VerifyScreen } from '@/screens/verify';

export default function VerifyRoute() {
  const router = useRouter();
  const { email, flow } = useLocalSearchParams<{ email?: string; flow?: string }>();
  // Opened without an address (a stale deep link): start again from the welcome screen.
  if (!email) return <Redirect href="/welcome" />;
  return (
    <VerifyScreen
      email={email}
      flow={flow === 'forgot' ? 'forgot' : 'signup'}
      onBack={() => router.back()}
    />
  );
}
