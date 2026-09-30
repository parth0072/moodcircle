import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

interface TextButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  /** small 13 px, medium 14 px, large 15 px bold and underlined (the design's "Log in" links). */
  size?: 'small' | 'medium' | 'large';
  /** brand blue on cream, or white on the blue screens. */
  tone?: 'brand' | 'onBrand';
  style?: StyleProp<ViewStyle>;
}

/** Inline link button with a generous tap area. */
export function TextButton({
  title,
  onPress,
  disabled,
  size = 'small',
  tone = 'brand',
  style,
}: TextButtonProps) {
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
      <AppText
        variant={size === 'large' ? 'linkBold' : size === 'medium' ? 'linkLg' : 'link'}
        color={tone}
        style={size === 'large' ? { textDecorationLine: 'underline' } : undefined}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
