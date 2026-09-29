import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme';

import { AppText } from './app-text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Selectable pill from the web `.chip`: 9x14 padding, 1.5 border; selected = brand tint, brand text, bold. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : null,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppText variant={selected ? 'link' : 'label'} color={selected ? 'brand' : 'textSecondary'}>
        {selected ? `✓ ${label}` : label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  selected: { borderColor: colors.brand, backgroundColor: colors.brandTint },
});
