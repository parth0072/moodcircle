import { Text, View } from 'react-native';

import { colors, spacing, type } from '@/theme';

// PHASE 0 PLACEHOLDER. Phase 1 replaces this with profile setup (name, username, avatar).
export default function Profile() {
  return (
    <View style={{ flex: 1, padding: spacing[6], backgroundColor: colors.background }}>
      <Text style={[type.displayMd, { color: colors.text }]}>Profile setup (placeholder)</Text>
    </View>
  );
}
