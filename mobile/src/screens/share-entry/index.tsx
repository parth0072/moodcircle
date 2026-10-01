import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Photo } from '@/components/photo';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { emotionLabels } from '@/constants/emotions';
import { MESSAGE_MAX } from '@/constants/journal';
import { useJournalEntry, useSetJournalShares, useSharePeople } from '@/hooks/use-journal';
import { colors, emotionColors, radius } from '@/theme';
import { describeError } from '@/utils/error-message';
import { pluralize } from '@/utils/groups';
import { dayLabel } from '@/utils/journal-dates';

import { PersonRow } from './person-row';

interface ShareEntryScreenProps {
  entryId: string;
  onBack: () => void;
  /** The entry was sent to the chosen people (or sharing was stopped). */
  onDone: () => void;
}

/** "Share with a friend": pick people from your groups, add a few words, choose whether the photos go. */
export function ShareEntryScreen({ entryId, onBack, onDone }: ShareEntryScreenProps) {
  const entry = useJournalEntry(entryId);
  const people = useSharePeople();
  const share = useSetJournalShares();
  // Null until the person ticks something: until then the people it is already shared with are ticked.
  const [ticked, setTicked] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const header = (
    <View style={styles.header}>
      <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      <AppText variant="button" style={styles.headerTitle}>
        Share with a friend
      </AppText>
      <View style={styles.headerSpace} />
    </View>
  );

  if (!entry.data) {
    return (
      <Screen background="background" align="start">
        {header}
        {entry.isError ? (
          <View style={styles.status}>
            <AppText color="textSecondary">
              {describeError(entry.error, 'Could not load that entry.')}
            </AppText>
            <Button title="Try again" variant="outline" onPress={() => void entry.refetch()} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading the entry" style={styles.status} />
        )}
      </Screen>
    );
  }

  const data = entry.data;
  const available = people.data ?? [];
  const alreadyShared = data.sharedWith.length > 0;
  const selected = (ticked ?? data.sharedWith.map((p) => p.id)).filter((id) =>
    available.some((p) => p.id === id),
  );
  const toggle = (id: string) =>
    setTicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const send = async () => {
    // Nobody ticked on an entry that was shared: this is "stop sharing". On a private one there is nothing to do.
    if (share.isPending || (selected.length === 0 && !alreadyShared)) return;
    setError(null);
    try {
      await share.mutateAsync({ id: data.id, recipientIds: selected, message, includePhotos });
      onDone();
    } catch (e) {
      setError(describeError(e, 'Could not share that. Please try again.'));
    }
  };

  const label =
    selected.length > 0
      ? `Send to ${pluralize(selected.length, 'friend')}`
      : alreadyShared
        ? 'Stop sharing'
        : 'Pick someone to share with';

  return (
    <Screen
      background="background"
      align="start"
      footer={
        <Button
          title={label}
          onPress={() => void send()}
          disabled={selected.length === 0 && !alreadyShared}
          loading={share.isPending}
          style={styles.cta}
        />
      }
    >
      {header}

      <View style={styles.summary}>
        <Photo
          uri={data.photos[0]?.url ?? null}
          fallbackColor={emotionColors[data.emotion]}
          style={styles.thumb}
        />
        <View style={styles.summaryTexts}>
          <AppText variant="titleMd" style={styles.summaryTitle} numberOfLines={2}>
            {data.title}
          </AppText>
          <AppText variant="bodySm" color="textSecondary">
            {[
              emotionLabels[data.emotion],
              ...(data.photoCount > 0 ? [pluralize(data.photoCount, 'photo')] : []),
              dayLabel(data.createdAt),
            ].join(' · ')}
          </AppText>
        </View>
      </View>

      <View style={styles.sendToRow}>
        <AppText variant="titleMd" accessibilityRole="header">
          Send to
        </AppText>
        <AppText variant="bodySm" color="textSecondary">
          {`${selected.length} selected`}
        </AppText>
      </View>

      {people.isPending ? (
        <ActivityIndicator accessibilityLabel="Loading your people" style={styles.status} />
      ) : people.isError ? (
        <View style={styles.status}>
          <AppText color="textSecondary">
            {describeError(people.error, 'Could not load the people you can share with.')}
          </AppText>
          <Button title="Try again" variant="outline" onPress={() => void people.refetch()} />
        </View>
      ) : available.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="titleMd">No one to share with yet</AppText>
          <AppText color="textSecondary">
            You can share with people who are in a group with you. Start a group, or join one with a
            code, from the Groups screen.
          </AppText>
        </View>
      ) : (
        <View style={styles.people}>
          {available.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              checked={selected.includes(person.id)}
              onToggle={() => toggle(person.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.message}>
        <TextField
          label="Add a message"
          value={message}
          onChangeText={setMessage}
          placeholder="Thought of you today…"
          maxLength={MESSAGE_MAX}
          editable={!share.isPending}
        />
      </View>

      {data.photoCount > 0 ? (
        <View style={styles.photosRow}>
          <View style={styles.photosTexts}>
            <AppText variant="bodyStrong">Include photos</AppText>
            <AppText variant="bodySm" style={styles.photosHint}>
              {includePhotos
                ? data.photoCount === 1
                  ? 'The photo will be sent'
                  : `All ${data.photoCount} photos will be sent`
                : 'Only your words will be sent'}
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Include photos"
            value={includePhotos}
            onValueChange={setIncludePhotos}
            trackColor={{ false: colors.dashed, true: colors.brand }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.dashed}
          />
        </View>
      ) : null}

      {error ? (
        <AppText color="danger" accessibilityRole="alert" style={styles.problem}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22 },
  headerSpace: { width: 48 },
  summary: {
    marginTop: 22,
    marginHorizontal: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  thumb: { width: 72, height: 72, borderRadius: 14, borderCurve: 'continuous' },
  summaryTexts: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 17, lineHeight: 22 },
  sendToRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  status: { marginTop: 24, gap: 16, alignItems: 'stretch' },
  empty: {
    marginTop: 12,
    gap: 6,
    padding: 18,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  people: {
    marginTop: 12,
    marginHorizontal: -8,
    overflow: 'hidden',
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  message: { marginTop: 18 },
  photosRow: {
    marginTop: 18,
    marginHorizontal: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  photosTexts: { flex: 1, gap: 2 },
  photosHint: { color: colors.sandText },
  problem: { marginTop: 12 },
  cta: { minHeight: 58 },
});
