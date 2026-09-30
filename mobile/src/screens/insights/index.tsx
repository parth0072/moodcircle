import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { useEntries } from '@/hooks/use-entries';
import {
  RANGE_DAYS,
  balanceScore,
  balanceTrend,
  checkedInDays,
  moodByDay,
  rankEmotions,
  summarySentence,
  type InsightRange,
} from '@/utils/insights';
import { addDays, lastDays, localDate } from '@/utils/local-date';

import { BalanceCard } from './balance-card';
import { MoodBlobs } from './mood-blobs';
import { SegmentedControl } from './segmented-control';
import { WeekDots } from './week-dots';

const RANGES: { value: InsightRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/** Mood insights: how the last week or month felt, from the user's own check-ins. */
export function InsightsScreen({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState<InsightRange>('week');
  const today = localDate();
  const length = RANGE_DAYS[range];
  // One request covers this period and the one before it, so the balance score can be compared.
  const entries = useEntries(addDays(today, -(2 * length - 1)), today);

  const header = (
    <View style={styles.header}>
      <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      <SegmentedControl options={RANGES} value={range} onChange={setRange} label="Range" />
      <View style={styles.headerSpace} />
    </View>
  );

  if (entries.isPending || entries.isError) {
    return (
      <Screen background="background" align="start">
        {header}
        <AppText variant="headlineLg" accessibilityRole="header" style={styles.title}>
          Your moods
        </AppText>
        {entries.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading your moods" style={styles.status} />
        ) : (
          <View style={styles.status}>
            <AppText color="textSecondary">Could not load your moods.</AppText>
            <Button title="Try again" variant="outline" onPress={() => void entries.refetch()} />
          </View>
        )}
      </Screen>
    );
  }

  const window = lastDays(today, length);
  const before = lastDays(addDays(today, -length), length);
  const days = moodByDay(entries.data, window);
  const ranked = rankEmotions(days);
  const checkedIn = checkedInDays(days);
  const score = balanceScore(days);
  const previous = balanceScore(moodByDay(entries.data, before));

  return (
    <Screen background="background" align="start">
      {header}
      <AppText variant="headlineLg" accessibilityRole="header" style={styles.title}>
        Your moods
      </AppText>
      <AppText color="textSecondary" style={styles.summary}>
        {summarySentence(range, checkedIn, ranked)}
      </AppText>

      {ranked.length > 0 ? (
        <View style={styles.blobs}>
          <MoodBlobs ranked={ranked} />
        </View>
      ) : null}

      <View style={styles.week}>
        <WeekDots days={moodByDay(entries.data, lastDays(today, 7))} today={today} />
      </View>

      <View style={styles.balance}>
        <BalanceCard score={score} trend={balanceTrend(score, previous, range)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpace: { width: 48 },
  title: { marginTop: 24 },
  summary: { marginTop: 8 },
  status: { marginTop: 32, gap: 16, alignItems: 'stretch' },
  blobs: { marginTop: 24 },
  week: { marginTop: 24 },
  balance: { marginTop: 24 },
});
