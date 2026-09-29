import { Text, type TextProps } from 'react-native';

import { accents, colors, type, type TextVariant } from '@/theme';

type TextColor = 'text' | 'textSecondary' | 'textTertiary' | 'brand' | 'onBrand' | 'danger';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
}

const palette: Record<TextColor, string> = {
  text: colors.text,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textTertiary,
  brand: colors.brand,
  onBrand: colors.onBrand,
  danger: accents.danger,
};

/** The one way screens render text: a type-ramp variant plus a colour token. Style merges last. */
export function AppText({ variant = 'body', color = 'text', style, ...props }: AppTextProps) {
  return <Text {...props} style={[type[variant], { color: palette[color] }, style]} />;
}
