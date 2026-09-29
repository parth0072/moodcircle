import { Text, View } from 'react-native';

import { colors, spacing, type } from '@/theme';

// PHASE 0 PLACEHOLDER. Phase 2 replaces this with the (tabs) group and the Home feed.
export default function Home() {
  return (
    <View style={{ flex: 1, padding: spacing[6], backgroundColor: colors.background }}>
      <Text style={[type.displayMd, { color: colors.text }]}>Home (placeholder)</Text>
    </View>
  );
}
