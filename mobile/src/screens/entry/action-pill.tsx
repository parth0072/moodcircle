import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radius } from '@/theme';

interface ActionPillProps {
  label: string;
  /** Filled with ink: the person's love is on. */
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** "Love · 1" and "Reply" under an entry: outlined pills, filled with ink when switched on. */
export function ActionPill({ label, active = false, disabled = false, onPress }: ActionPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.active : null,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <AppText variant="label" color={active ? 'onInk' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
});
