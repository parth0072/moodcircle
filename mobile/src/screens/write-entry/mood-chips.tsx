import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { emotionLabels, type Emotion } from '@/constants/emotions';
import { WRITE_EMOTIONS } from '@/constants/journal';
import { colors, emotionColors, fontFamily, radius } from '@/theme';

interface MoodChipsProps {
  value: Emotion | null;
  onChange: (emotion: Emotion) => void;
}

/** The six moods as a row of pills with a colour dot; the row scrolls sideways as in the design. */
export function MoodChips({ value, onChange }: MoodChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="How do you feel?"
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {WRITE_EMOTIONS.map((emotion) => {
        const selected = emotion === value;
        return (
          <Pressable
            key={emotion}
            accessibilityRole="radio"
            accessibilityLabel={emotionLabels[emotion]}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(emotion)}
            style={({ pressed }) => [
              styles.chip,
              selected
                ? { backgroundColor: emotionColors[emotion], borderColor: colors.ink }
                : null,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: emotionColors[emotion] }]} />
            <AppText style={styles.label}>{emotionLabels[emotion]}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The row runs to the screen edge, so the last pill can scroll into view; the first starts 16 in.
  row: { gap: 8, paddingHorizontal: 16 },
  chip: {
    height: 40,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 26, height: 26, borderRadius: radius.full },
  label: { fontFamily: fontFamily.display.semibold, fontSize: 15, lineHeight: 20 },
});
