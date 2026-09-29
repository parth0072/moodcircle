import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

interface TextButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  /** 'small' is the web's 13px link ("Sign in with password instead"), 'medium' the 14px one ("Resend"). */
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

/** Inline brand-coloured link button with a 44pt-friendly tap area. */
export function TextButton({ title, onPress, disabled, size = 'small', style }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, style]}
    >
      <AppText variant={size === 'medium' ? 'linkLg' : 'link'} color="brand">
        {title}
      </AppText>
    </Pressable>
  );
}
