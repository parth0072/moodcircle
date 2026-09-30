import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

import { Icon, type IconName } from './icon';

interface RoundButtonProps {
  icon: IconName;
  /** Required: the icon itself is decorative, so this is what a screen reader announces. */
  label: string;
  onPress?: () => void;
  /** light: on cream, a tan outline. glass: on a blue screen, translucent white. */
  tone?: 'light' | 'glass';
  style?: StyleProp<ViewStyle>;
}

/** 48 pt round icon button used for back, insights, log and edit in the design's headers. */
export function RoundButton({ icon, label, onPress, tone = 'light', style }: RoundButtonProps) {
  const glass = tone === 'glass';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        glass ? styles.glass : styles.light,
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Icon name={icon} size={glass ? 22 : 20} color={glass ? colors.onBrand : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { borderWidth: 1.5, borderColor: colors.line },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
