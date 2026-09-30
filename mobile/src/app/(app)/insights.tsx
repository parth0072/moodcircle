import { useRouter } from 'expo-router';

import { InsightsScreen } from '@/screens/insights';

export default function InsightsRoute() {
  const router = useRouter();
  return <InsightsScreen onBack={() => router.back()} />;
}
