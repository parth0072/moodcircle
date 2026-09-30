import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { accents, colors, radius } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'accent' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  /**
   * primary: ink pill (the design's main action). accent: yellow pill for use on the blue welcome
   * screen. outline: white pill with a tan border. danger: outlined red, for "Log out".
   */
  variant?: Variant;
  /** Shows a spinner, blocks repeat taps, and keeps the label available to screen readers. */
  loading?: boolean;
  disabled?: boolean;
  /** A small icon before the label, like the plus on "Create a group". */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

const looks = {
  primary: { container: 'primary', text: 'onInk', label: 'button', spinner: colors.onInk },
  accent: { container: 'accent', text: 'text', label: 'buttonBold', spinner: colors.ink },
  outline: { container: 'outline', text: 'text', label: 'button', spinner: colors.ink },
  danger: { container: 'danger', text: 'danger', label: 'buttonBold', spinner: accents.danger },
} as const;

/** Full-width pill, 56 high, from the design's primary, accent and log-out buttons. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const look = looks[variant];
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
        styles[look.container],
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={look.spinner} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} strokeWidth={2.2} color={look.spinner} /> : null}
          <AppText variant={look.label} color={look.text}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.ink,
    boxShadow: '0 10px 24px rgba(30, 42, 90, 0.28)',
  },
  accent: { backgroundColor: accents.sun },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  danger: {
    borderWidth: 1.5,
    borderColor: accents.danger,
  },
});
