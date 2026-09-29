import { useRouter } from 'expo-router';

import { SignInScreen } from '@/screens/sign-in';

export default function SignInRoute() {
  const router = useRouter();
  return (
    <SignInScreen
      onCodeRequested={(email) => router.push({ pathname: '/verify', params: { email } })}
    />
  );
}
