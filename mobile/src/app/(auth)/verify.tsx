import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { VerifyScreen } from '@/screens/verify';

export default function VerifyRoute() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  // Opened without an address (a stale deep link): start again at sign-in.
  if (!email) return <Redirect href="/sign-in" />;
  return <VerifyScreen email={email} onBack={() => router.back()} />;
}
