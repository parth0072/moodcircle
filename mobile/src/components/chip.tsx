import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius } from '@/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** checkbox: any number can be on (tags). radio: one of a group (the journal's filter). */
  role?: 'checkbox' | 'radio';
}

/** A pill under a question: outlined, or filled with ink when chosen. */
export function Chip({ label, selected, onPress, role = 'checkbox' }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
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
