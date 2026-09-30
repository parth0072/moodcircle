import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius } from '@/theme';

interface TagChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** A tag under "What's behind it?": outlined, or filled with ink when chosen. */
export function TagChip({ label, selected, onPress }: TagChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : null,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppText variant="bodySm" color={selected ? 'onInk' : 'text'} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { fontFamily: fontFamily.body.medium },
});
