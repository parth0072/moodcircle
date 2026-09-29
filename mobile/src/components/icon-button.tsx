import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

import { Icon, type IconName } from './icon';

interface IconButtonProps {
  icon: IconName;
  /** Required: the icon itself is decorative, so this is what a screen reader announces. */
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** 34x34 bordered square from the web `.icon-btn`. */
export function IconButton({ icon, label, onPress, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Icon name={icon} size={16} color={colors.textSecondary} strokeWidth={3.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
