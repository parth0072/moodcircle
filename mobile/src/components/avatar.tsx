import { StyleSheet, View } from 'react-native';

import { fontFamily, radius } from '@/theme';

import { AppText } from './app-text';

interface AvatarProps {
  initial: string;
  /** Fill: an emotion's colour, or the grey of a member who has not posted yet. */
  color: string;
  /** Outer width and height, ring included. */
  size: number;
  fontSize: number;
  /** DM Sans (stacked avatars on a card) or Fraunces (the feed). */
  font?: 'sans' | 'serif';
  /** A ring: the white gap between stacked avatars, or the cream one on the blue feed header. */
  ringWidth?: number;
  ringColor?: string;
  /** Softer letter, for the grey "+2" and members who have not posted. */
  muted?: boolean;
}

/**
 * A round initial in a colour, from the group screens. Decorative: whatever contains it (a card, a
 * post) carries the label a screen reader announces.
 */
export function Avatar({
  initial,
  color,
  size,
  fontSize,
  font = 'sans',
  ringWidth = 0,
  ringColor = 'transparent',
  muted = false,
}: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: color,
          borderWidth: ringWidth,
          borderColor: ringColor,
        },
      ]}
    >
      <AppText
        color={muted ? 'textSecondary' : 'text'}
        style={{
          fontFamily: font === 'serif' ? fontFamily.display.bold : fontFamily.body.bold,
          fontSize,
          lineHeight: Math.round(fontSize * 1.25),
        }}
      >
        {initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
