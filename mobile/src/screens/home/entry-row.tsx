import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmotionFace } from '@/components/emotion-face';
import { emotionLabels, INTENSITY_LABELS } from '@/constants/emotions';
import type { Entry } from '@/api/schemas/entry';
import { colors, radius } from '@/theme';
import { formatTime } from '@/utils/local-date';

/** One check-in from today: its face, how strong it was and when, and a line of what was written. */
export function EntryRow({ entry, onPress }: { entry: Entry; onPress: () => void }) {
  const detail = entry.note || entry.tags.join(' · ');
  const label = emotionLabels[entry.emotion];
  const strength = INTENSITY_LABELS[entry.intensity - 1];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${strength}, ${formatTime(entry.createdAt)}. Edit`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <EmotionFace emotion={entry.emotion} size={44} />
      <View style={styles.text}>
        <AppText variant="titleMd">{label}</AppText>
        <AppText variant="bodySm" color="textSecondary">
          {`${strength} · ${formatTime(entry.createdAt)}`}
        </AppText>
        {detail ? (
          <AppText variant="bodySm" color="textSoft" numberOfLines={1}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, gap: 1 },
});
