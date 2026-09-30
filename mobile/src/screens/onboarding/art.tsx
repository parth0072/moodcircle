import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Blob } from '@/components/blob';
import { Flower } from '@/components/flower';
import { OutlineFace, OutlineFaceShapes } from '@/components/outline-face';
import { emotionLabels, type Emotion } from '@/constants/emotions';
import { colors, emotionColors, fontFamily } from '@/theme';

/** The cream pill naming an emotion, tilted a little, as on the design's intro screen. */
function Label({ emotion, style }: { emotion: Emotion; style: ViewStyle }) {
  return (
    <View style={[styles.label, style]}>
      <AppText variant="pill" style={styles.labelText}>
        {emotionLabels[emotion]}
      </AppText>
    </View>
  );
}

/** Meh and Worry, near the top, and the blue scribble arrow pointing down at the headline. */
export function TopCollage() {
  return (
    <View style={styles.box} pointerEvents="none">
      <View style={[styles.placed, { left: -18, top: 28, transform: [{ rotate: '-6deg' }] }]}>
        <Blob shape="meh" color={emotionColors.meh} width={176} height={168} />
        <View style={styles.face}>
          <OutlineFace emotion="meh" size={112} />
        </View>
      </View>
      <Label emotion="meh" style={{ left: 30, top: 12 }} />

      <View
        style={[
          styles.card,
          {
            right: -22,
            top: 50,
            width: 184,
            height: 160,
            borderRadius: 28,
            backgroundColor: emotionColors.calm,
            transform: [{ rotate: '4deg' }],
          },
        ]}
      >
        <OutlineFace emotion="worry" size={116} />
      </View>
      <Label emotion="worry" style={{ right: 34, top: 192, transform: [{ rotate: '-4deg' }] }} />

      <Svg
        width={44}
        height={64}
        viewBox="0 0 44 64"
        style={[styles.placed, { left: 150, top: 206 }]}
      >
        <Path
          d="M10 4 q-6 18 10 20 q14 2 4 -10 q-10 -8 -8 14 q2 20 14 30 M20 52 l4 10 l8 -8"
          fill="none"
          stroke="#6BB5E8"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** Anger and Joy, near the bottom, tucked behind the Get started button. */
export function BottomCollage() {
  return (
    <View style={styles.box} pointerEvents="none">
      <View
        style={[
          styles.card,
          {
            left: -26,
            top: 12,
            width: 170,
            height: 150,
            borderRadius: 30,
            backgroundColor: emotionColors.anger,
            transform: [{ rotate: '8deg' }],
          },
        ]}
      >
        <OutlineFace emotion="anger" size={112} />
      </View>
      <Label emotion="anger" style={{ left: 104, top: 116, transform: [{ rotate: '-6deg' }] }} />

      <Svg
        width={200}
        height={200}
        viewBox="0 0 100 100"
        style={[styles.placed, { right: -34, top: 0 }]}
      >
        <Flower color={emotionColors.joy} petal={13} />
        <G transform="translate(20 20) scale(.6)">
          <OutlineFaceShapes emotion="joy" />
        </G>
      </Svg>
      <Label emotion="joy" style={{ right: 18, top: 106 }} />
    </View>
  );
}

/** The orange wave under the headline. */
export function Squiggle() {
  return (
    <Svg width={120} height={16} viewBox="0 0 120 16" style={styles.squiggle}>
      <Path
        d="M2 10 q8 -8 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
        fill="none"
        stroke="#F7A93B"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  box: { height: 240 },
  placed: { position: 'absolute' },
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  labelText: { fontFamily: fontFamily.display.semibold, fontSize: 16, lineHeight: 22 },
  squiggle: { alignSelf: 'flex-end', marginTop: 6, marginRight: 70 },
});
