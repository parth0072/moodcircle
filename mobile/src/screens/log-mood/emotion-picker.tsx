import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmotionFace } from '@/components/emotion-face';
import { EMOTIONS, emotionLabels, type Emotion } from '@/constants/emotions';
import { colors, radius } from '@/theme';

interface EmotionPickerProps {
  value: Emotion | null;
  onChange: (emotion: Emotion) => void;
}

/** The six emotions as a row of faces, for logging from the Log screen without Home's pills. */
export function EmotionPicker({ value, onChange }: EmotionPickerProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="How are you feeling?"
    >
      {EMOTIONS.map((emotion) => {
        const selected = emotion === value;
        return (
          <Pressable
            key={emotion}
            accessibilityRole="radio"
            accessibilityLabel={emotionLabels[emotion]}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(emotion)}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.ring, selected ? styles.ringSelected : null]}>
              <EmotionFace emotion={emotion} size={44} />
            </View>
            <AppText variant="caption" color={selected ? 'text' : 'textSecondary'}>
              {emotionLabels[emotion]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  item: { alignItems: 'center', gap: 4, width: 52 },
  ring: {
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringSelected: { borderColor: colors.ink },
});
