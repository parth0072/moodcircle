import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radius } from '@/theme';

/** After a sad or worried mood: a gentle nudge to let someone close know. */
export function HeavyDayBanner({ onTell }: { onTell: () => void }) {
  return (
    <View style={styles.banner}>
      <AppText variant="bodySm" style={styles.text}>
        Heavy day? It can help to let someone close know.
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tell a friend"
        onPress={onTell}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
      >
        <AppText variant="label" color="onBrand">
          Tell a friend
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.skyTint,
  },
  text: { flex: 1, lineHeight: 20 },
  button: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
