import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { accents, colors, fontFamily, radius } from '@/theme';

interface BalanceCardProps {
  /** 0 to 100, or null while there are fewer than two checked-in days. */
  score: number | null;
  trend: string;
}

/** The amber "Your balance score" card. See balanceScore() in utils/insights.ts for what it measures. */
export function BalanceCard({ score, trend }: BalanceCardProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Your balance score: ${score ?? 'not enough check-ins yet'}. ${trend}`}
    >
      <View style={styles.score}>
        <AppText variant="titleMd" style={styles.scoreText}>
          {score === null ? '–' : String(score)}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="titleMd">Your balance score</AppText>
        <AppText variant="bodySm">{trend}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: accents.amber,
  },
  score: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontFamily: fontFamily.display.bold },
  text: { flex: 1, gap: 2 },
});
