import { useRouter } from 'expo-router';

import { WelcomeScreen } from '@/screens/welcome';

export default function WelcomeRoute() {
  const router = useRouter();
  return (
    <WelcomeScreen
      onCreateAccount={() => router.push('/sign-up')}
      onLogIn={() => router.push('/log-in')}
    />
  );
}
