import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radius } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** The Week / Month switch: a pill track with the chosen option filled with ink. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected ? styles.selected : null]}
          >
            <AppText variant="button" color={selected ? 'onInk' : 'text'} style={styles.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: colors.track,
  },
  option: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.ink },
  text: { fontSize: 15, lineHeight: 20 },
});
