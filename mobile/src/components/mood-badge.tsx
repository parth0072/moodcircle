import { StyleSheet, View } from 'react-native';

import { emotionLabels, type Emotion } from '@/constants/emotions';
import { emotionColors, fontFamily, radius } from '@/theme';

import { AppText } from './app-text';

interface MoodBadgeProps {
  emotion: Emotion;
  /** sm: on a card in the list. md: on an entry's own page. */
  size?: 'sm' | 'md';
}

/** The emotion's name on its own colour: "Joy" on pink, "Sad" on blue. The card around it says the rest. */
export function MoodBadge({ emotion, size = 'sm' }: MoodBadgeProps) {
  const md = size === 'md';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        md ? styles.md : styles.sm,
        { backgroundColor: emotionColors[emotion] },
      ]}
    >
      <AppText
        style={{
          // Fraunces on the entry's own page, DM Sans bold on a card: both from the design.
          fontFamily: md ? fontFamily.display.semibold : fontFamily.body.bold,
          fontSize: md ? 14 : 12,
          lineHeight: md ? 18 : 16,
        }}
      >
        {emotionLabels[emotion]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, justifyContent: 'center', alignSelf: 'flex-start' },
  sm: { height: 24, paddingHorizontal: 10 },
  md: { height: 26, paddingHorizontal: 12 },
});
