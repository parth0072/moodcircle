import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp } from 'react-native';

import { colors } from '@/theme';

import { Icon } from './icon';

interface PhotoProps {
  /** The photo's address or a local file; null shows a plain tile instead. */
  uri: string | null;
  /** What a screen reader says. Leave it out for a photo the surrounding text already describes. */
  label?: string;
  /** The tile's colour when there is no photo. */
  fallbackColor?: string;
  style?: StyleProp<ImageStyle>;
}

/** A photo that fills its box. Cached by the image library, so a link that stays the same is not fetched twice. */
export function Photo({ uri, label, fallbackColor = colors.sand, style }: PhotoProps) {
  if (!uri) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.fallback, { backgroundColor: fallbackColor }, style as never]}
      >
        <Icon name="book" size={24} color={colors.ink} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      transition={150}
      accessible={!!label}
      accessibilityLabel={label}
      style={[styles.image, style]}
    />
  );
}

const styles = StyleSheet.create({
  // The sand behind the picture shows while it loads.
  image: { backgroundColor: colors.sand },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
