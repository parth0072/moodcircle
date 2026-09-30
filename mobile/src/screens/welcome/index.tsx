import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextButton } from '@/components/text-button';
import { accents, colors } from '@/theme';

import { WelcomeArt } from './art';

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onLogIn: () => void;
}

/** Blue welcome screen: the promise in one line, then Create an account or Log in. */
export function WelcomeScreen({ onCreateAccount, onLogIn }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={styles.art}>
        <WelcomeArt />
      </View>

      <View style={styles.copy}>
        <AppText variant="titleLg" style={styles.brand}>
          Moodbloom
        </AppText>
        <AppText
          variant="headline"
          color="onBrand"
          accessibilityRole="header"
          style={styles.center}
        >
          A kinder place for your feelings
        </AppText>
        <AppText variant="input" color="onBrand" style={[styles.center, styles.sub]}>
          Check in daily, spot patterns and find what helps.
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button title="Create an account" variant="accent" onPress={onCreateAccount} />
        <View style={styles.login}>
          <AppText variant="input" color="onBrand" style={styles.sub}>
            {'Already have an account? '}
          </AppText>
          <TextButton title="Log in" size="large" tone="onBrand" onPress={onLogIn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: 24 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  copy: { alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingBottom: 32 },
  brand: { color: accents.sun },
  center: { textAlign: 'center' },
  sub: { opacity: 0.85 },
  actions: { gap: 14 },
  login: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
