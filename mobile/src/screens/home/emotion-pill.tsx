import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmotionFace } from '@/components/emotion-face';
import { emotionLabels, type Emotion } from '@/constants/emotions';
import { accents, radius } from '@/theme';

interface EmotionPillProps {
  emotion: Emotion;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** One of the six emotions on the blue header: a translucent pill with its face, ringed when chosen. */
export function EmotionPill({ emotion, selected, disabled, onPress }: EmotionPillProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={emotionLabels[emotion]}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { opacity: disabled ? 0.6 : pressed ? 0.8 : 1 }]}
    >
      <EmotionFace emotion={emotion} size={32} />
      <AppText variant="pill" color="onBrand">
        {emotionLabels[emotion]}
      </AppText>
      {selected ? <View style={styles.ring} pointerEvents="none" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 48,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Drawn 3 pt outside the pill, like the design's selection ring.
  ring: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderWidth: 2,
    borderColor: accents.sun,
    borderRadius: radius.full,
  },
});
