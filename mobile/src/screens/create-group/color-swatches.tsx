import { Pressable, StyleSheet, View } from 'react-native';

import { GROUP_COLOR_KEYS, groupColorLabels, type GroupColor } from '@/constants/groups';
import { colors, groupColors } from '@/theme';

interface ColorSwatchesProps {
  value: GroupColor;
  onChange: (color: GroupColor) => void;
}

/** The five colours a group can take: the chosen one gets a cream ring inside and an ink ring outside. */
export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Group colour" style={styles.row}>
      {GROUP_COLOR_KEYS.map((key) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={groupColorLabels[key]}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(key)}
            style={[
              styles.swatch,
              {
                backgroundColor: groupColors[key],
                borderColor: selected ? colors.background : groupColors[key],
              },
              selected ? styles.selected : null,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 3, borderCurve: 'continuous' },
  selected: { boxShadow: '0 0 0 2px #1E2A5A' },
});
