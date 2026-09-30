import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';

/** Faint leaves along both edges of the blue header (12% white), as in the design. */
export function Leaves() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={120} height={260} viewBox="0 0 120 260" style={styles.left}>
        <G fill="#FFFFFF">
          <Ellipse cx="40" cy="30" rx="10" ry="22" transform="rotate(-20 40 30)" />
          <Ellipse cx="70" cy="110" rx="9" ry="20" transform="rotate(25 70 110)" />
          <Ellipse cx="30" cy="190" rx="10" ry="22" transform="rotate(-35 30 190)" />
        </G>
      </Svg>
      <Svg width={110} height={280} viewBox="0 0 110 280" style={styles.right}>
        <G fill="#FFFFFF">
          <Ellipse cx="60" cy="40" rx="9" ry="20" transform="rotate(20 60 40)" />
          <Ellipse cx="40" cy="140" rx="10" ry="22" transform="rotate(-25 40 140)" />
          <Ellipse cx="70" cy="230" rx="9" ry="20" transform="rotate(30 70 230)" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  left: { position: 'absolute', top: 120, left: -30, opacity: 0.12 },
  right: { position: 'absolute', top: 90, right: -24, opacity: 0.12 },
});
