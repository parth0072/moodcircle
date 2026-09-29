import { Text, View } from 'react-native';

import { colors, spacing, type } from '@/theme';

// PHASE 0 PLACEHOLDER. Phase 1 replaces this with the real sign-in screen
// (and adds verify.tsx and password.tsx next to it). Delete this comment then.
export default function SignIn() {
  return (
    <View style={{ flex: 1, padding: spacing[6], backgroundColor: colors.background }}>
      <Text style={[type.displayLg, { color: colors.text }]}>MoodCircle</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>Sign in (placeholder)</Text>
    </View>
  );
}
