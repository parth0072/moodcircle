import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  background?: 'surface' | 'background';
  /** Vertical alignment of the content when it is shorter than the screen. */
  align?: 'center' | 'start';
  /** Non-scrolling layer drawn behind the content (decorative shapes). Never receives touches. */
  decoration?: ReactNode;
  /** Overrides the default top padding (sheets use a small one because the grabber sits above them). */
  top?: number;
  /** Colour of the status bar text: dark on cream (default), light on a blue header. */
  statusBar?: 'light' | 'dark';
}

/**
 * Full-screen form container: a ScrollView that respects the safe area
 * (`contentInsetAdjustmentBehavior`, not SafeAreaView), lifts above the keyboard on iOS
 * (`automaticallyAdjustKeyboardInsets`) and lets the first tap reach buttons while a field is focused.
 */
export function Screen({
  children,
  background = 'surface',
  align = 'center',
  decoration,
  top,
  statusBar = 'dark',
}: ScreenProps) {
  return (
    <View style={[styles.root, { backgroundColor: colors[background] }]}>
      <StatusBar style={statusBar} />
      {decoration ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {decoration}
        </View>
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          align === 'center' ? styles.center : styles.start,
          top === undefined ? null : { paddingTop: top },
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  center: { justifyContent: 'center', paddingTop: 40 },
  start: { justifyContent: 'flex-start', paddingTop: 12 },
});
