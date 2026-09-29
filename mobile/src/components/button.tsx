import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius } from '@/theme';

import { AppText } from './app-text';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  /** Shows a spinner, blocks repeat taps, and keeps the label available to screen readers. */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Pill button from the web `.btn`: 13x18 padding, 15/600 label, full width, pressed 0.8, disabled 0.5. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? colors.onBrand : colors.brand} />
      ) : (
        <AppText variant="bodyStrong" color={primary ? 'onBrand' : 'text'}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primary: { backgroundColor: colors.brand },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
