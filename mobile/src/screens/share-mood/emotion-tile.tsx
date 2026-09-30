import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { emotionLabels, type Emotion } from '@/constants/emotions';
import { colors, emotionColors, fontFamily } from '@/theme';

interface EmotionTileProps {
  emotion: Emotion;
  selected: boolean;
  onPress: () => void;
}

/** One of the six moods as a big tile: a colour dot and its name; filled with the colour when chosen. */
export function EmotionTile({ emotion, selected, onPress }: EmotionTileProps) {
  const color = emotionColors[emotion];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={emotionLabels[emotion]}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: selected ? color : colors.surface,
          borderColor: selected ? colors.ink : colors.sand,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText style={styles.label}>{emotionLabels[emotion]}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 92,
    gap: 8,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    boxShadow: 'inset 0 0 0 2px rgba(30, 42, 90, 0.15)',
  },
  label: { fontFamily: fontFamily.display.semibold, fontSize: 17, lineHeight: 22 },
});
