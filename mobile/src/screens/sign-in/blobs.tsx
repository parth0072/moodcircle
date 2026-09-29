import { StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/mood-face';
import { moodColors } from '@/theme';

/** Two tilted tinted shapes with a mood face each, behind the sign-in form (web `#s-auth` decoration). */
export function SignInBlobs() {
  return (
    <>
      <View style={[styles.blob, styles.top]}>
        <MoodFace level={4} size={70} />
      </View>
      <View style={[styles.blob, styles.bottom]}>
        <MoodFace level={5} size={74} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // The web draws an organic elliptical blob; React Native has one radius per corner, so the
  // four are varied by hand to keep the same loose, uneven outline.
  top: {
    top: 64,
    left: -22,
    width: 120,
    height: 112,
    backgroundColor: moodColors[4].tint,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 58,
    borderBottomRightRadius: 52,
    borderBottomLeftRadius: 60,
    transform: [{ rotate: '-8deg' }],
  },
  bottom: {
    bottom: 52,
    right: -26,
    width: 128,
    height: 116,
    backgroundColor: moodColors[5].tint,
    borderRadius: 30,
    borderCurve: 'continuous',
    transform: [{ rotate: '7deg' }],
  },
});
