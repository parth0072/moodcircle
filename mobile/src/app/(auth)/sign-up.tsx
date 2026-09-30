import { useRouter } from 'expo-router';

import { SignUpScreen } from '@/screens/sign-up';

export default function SignUpRoute() {
  const router = useRouter();
  return (
    <SignUpScreen
      onBack={() => router.back()}
      onLogIn={() => router.replace('/log-in')}
      onCodeSent={(email) =>
        router.push({ pathname: '/verify', params: { email, flow: 'signup' } })
      }
    />
  );
}
