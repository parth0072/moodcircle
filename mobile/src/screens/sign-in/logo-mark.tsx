import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/** The app mark from the web `.logo-icon`: a 44x44 brand tile with a centre dot and four satellites. */
export function LogoMark() {
  return (
    <View style={styles.tile}>
      <Svg width={26} height={26} viewBox="0 0 26 26" fill="none" accessibilityElementsHidden>
        <Circle cx="13" cy="13" r="4.5" fill="white" opacity={0.95} />
        <Circle cx="5" cy="7" r="2.5" fill="white" opacity={0.6} />
        <Circle cx="21" cy="7" r="2.5" fill="white" opacity={0.6} />
        <Circle cx="5" cy="19" r="2.5" fill="white" opacity={0.6} />
        <Circle cx="21" cy="19" r="2.5" fill="white" opacity={0.6} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
