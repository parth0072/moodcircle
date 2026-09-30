import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { colors } from '@/theme';

import { BottomCollage, Squiggle, TopCollage } from './art';

/** Phones shorter than this drop the bottom illustrations so they never crowd the headline. */
const COMPACT_HEIGHT = 720;

interface OnboardingScreenProps {
  onStart: () => void;
}

/** The intro: illustrations of four emotions around one line of copy and "Get started". */
export function OnboardingScreen({ onStart }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <AppText
        variant="wordmark"
        color="brand"
        accessibilityRole="header"
        style={[styles.wordmark, { top: insets.top + 8 }]}
      >
        Moodbloom
      </AppText>

      {compact ? null : (
        <>
          <View style={[styles.top, { top: insets.top + 54 }]}>
            <TopCollage />
          </View>
          <View style={styles.bottom}>
            <BottomCollage />
          </View>
        </>
      )}

      <View style={styles.copy}>
        <AppText variant="display" style={styles.headline}>
          Notice how you feel, one day at a time
        </AppText>
        <Squiggle />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button title="Get started" onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  wordmark: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  top: { position: 'absolute', left: 0, right: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  copy: { paddingHorizontal: 32 },
  headline: { textAlign: 'center' },
  footer: { position: 'absolute', left: 60, right: 60, bottom: 0 },
});
