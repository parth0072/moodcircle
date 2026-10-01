import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { TextButton } from '@/components/text-button';
import { EMOTIONS, emotionLabels, type Emotion } from '@/constants/emotions';
import { useCreateEntry, useDeleteEntry, useEntries, useUpdateEntry } from '@/hooks/use-entries';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';
import { colors, radius } from '@/theme';
import { describeError } from '@/utils/error-message';
import { greeting, localDate } from '@/utils/local-date';

import { EmotionPill } from './emotion-pill';
import { EntryRow } from './entry-row';
import { Leaves } from './leaves';
import { Sunset } from './sunset';

/** A quick tap logs "Moderate": the Log screen is where strength, tags and a note are added. */
const QUICK_INTENSITY = 3;

interface HomeScreenProps {
  onOpenProfile: () => void;
  onOpenGroups: () => void;
  onOpenJournal: () => void;
  onOpenInsights: () => void;
  /** Opens the Log screen: for an entry to add details to, or (no id) to log a new one there. */
  onOpenLog: (entryId?: string) => void;
}

/** The emotion chosen in this visit and the entry it created, so tapping it again can undo it. */
interface Picked {
  emotion: Emotion;
  entryId: string;
}

export function HomeScreen({
  onOpenProfile,
  onOpenGroups,
  onOpenJournal,
  onOpenInsights,
  onOpenLog,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const name = useSessionStore((s) => s.user?.name);
  const notice = useUiStore((s) => s.notice);
  const today = localDate();
  const entries = useEntries(today, today);
  const create = useCreateEntry();
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending || remove.isPending;

  // Tapping an emotion logs it right away. Tapping another one corrects that entry instead of adding
  // a second; tapping the chosen one again undoes it. Details come later, on the Log screen.
  const choose = async (emotion: Emotion) => {
    if (busy) return;
    setError(null);
    try {
      if (!picked) {
        const entry = await create.mutateAsync({
          emotion,
          intensity: QUICK_INTENSITY,
          date: today,
        });
        setPicked({ emotion, entryId: entry.id });
      } else if (picked.emotion === emotion) {
        await remove.mutateAsync(picked.entryId);
        setPicked(null);
      } else {
        await update.mutateAsync({ id: picked.entryId, patch: { emotion } });
        setPicked({ emotion, entryId: picked.entryId });
      }
    } catch (e) {
      // Nothing was saved (or undone): the pills keep showing what is really stored.
      setError(describeError(e, 'Could not save that. Please try again.'));
    }
  };

  const todays = [...(entries.data ?? [])].reverse();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Leaves />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <RoundButton icon="person" label="Profile" tone="glass" onPress={onOpenProfile} />
          <AppText variant="button" color="onBrand" style={styles.name} numberOfLines={1}>
            {name}
          </AppText>
          <RoundButton icon="users" label="Groups" tone="glass" onPress={onOpenGroups} />
          <RoundButton icon="book" label="Journal" tone="glass" onPress={onOpenJournal} />
          <RoundButton icon="pie" label="Mood insights" tone="glass" onPress={onOpenInsights} />
          <RoundButton
            icon="calendar"
            label="Log a mood"
            tone="glass"
            onPress={() => onOpenLog(picked?.entryId)}
          />
        </View>

        <View style={styles.hero}>
          <Sunset />
          <AppText
            variant="headlineLg"
            color="onBrand"
            accessibilityRole="header"
            style={styles.greeting}
          >
            {greeting()}
          </AppText>
          <AppText
            variant="input"
            color="onBrand"
            style={styles.prompt}
            accessibilityLiveRegion="polite"
          >
            {picked
              ? `Logged: ${emotionLabels[picked.emotion]} · tap again to undo`
              : 'How did today feel?'}
          </AppText>
          {error ? (
            <AppText variant="label" color="onBrand" accessibilityRole="alert" style={styles.error}>
              {error}
            </AppText>
          ) : null}
        </View>

        <View
          style={styles.pills}
          accessibilityRole="radiogroup"
          accessibilityLabel="How did today feel?"
        >
          {EMOTIONS.map((emotion) => (
            <EmotionPill
              key={emotion}
              emotion={emotion}
              selected={picked?.emotion === emotion}
              disabled={busy}
              onPress={() => void choose(emotion)}
            />
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
          {notice ? (
            <View style={styles.notice} accessibilityRole="alert">
              <AppText variant="bodySm" style={styles.noticeText}>
                {notice}
              </AppText>
              <TextButton
                title="Got it"
                size="medium"
                onPress={() => useUiStore.getState().clearNotice()}
              />
            </View>
          ) : null}

          <AppText variant="titleLg" accessibilityRole="header">
            Today
          </AppText>
          {entries.isPending ? (
            <ActivityIndicator color={colors.brand} style={styles.loading} />
          ) : entries.isError ? (
            <View style={styles.message}>
              <AppText color="textSecondary">Could not load today&apos;s check-ins.</AppText>
              <Button title="Try again" variant="outline" onPress={() => void entries.refetch()} />
            </View>
          ) : todays.length === 0 ? (
            <AppText color="textSecondary">
              Nothing logged yet today. Tap how you feel above, or use the calendar to add details.
            </AppText>
          ) : (
            <View style={styles.list}>
              {todays.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onPress={() => onOpenLog(entry.id)} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand },
  top: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  name: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, marginTop: 28 },
  greeting: { marginTop: 6, textAlign: 'center' },
  prompt: { opacity: 0.82, textAlign: 'center' },
  error: { textAlign: 'center' },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    paddingTop: 12,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D6D2C6',
    alignSelf: 'center',
  },
  sheetContent: { padding: 24, paddingBottom: 40, gap: 14 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
  },
  noticeText: { flex: 1 },
  loading: { marginTop: 8 },
  message: { gap: 12 },
  list: { gap: 10 },
});
