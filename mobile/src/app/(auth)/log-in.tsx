import { useRouter } from 'expo-router';

import { LogInScreen } from '@/screens/log-in';

export default function LogInRoute() {
  const router = useRouter();
  return (
    <LogInScreen
      onBack={() => router.back()}
      onSignUp={() => router.replace('/sign-up')}
      onForgotCodeSent={(email) =>
        router.push({ pathname: '/verify', params: { email, flow: 'forgot' } })
      }
    />
  );
}
