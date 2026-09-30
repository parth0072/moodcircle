import { Pressable, StyleSheet, View } from 'react-native';

import { INTENSITY_LABELS } from '@/constants/emotions';
import { accents, colors, radius } from '@/theme';

interface IntensityBarProps {
  /** 1 to 5. */
  value: number;
  onChange: (value: number) => void;
}

/** "How strong?": five blocks, filled up to the chosen strength (the design's pink blocks). */
export function IntensityBar({ value, onChange }: IntensityBarProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="How strong?">
      {INTENSITY_LABELS.map((label, index) => {
        const level = index + 1;
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityLabel={`${level} of 5, ${label}`}
            accessibilityState={{ checked: level === value }}
            onPress={() => onChange(level)}
            style={[
              styles.block,
              { backgroundColor: level <= value ? accents.strength : colors.sand },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  block: { flex: 1, height: 44, borderRadius: radius.sm, borderCurve: 'continuous' },
});
