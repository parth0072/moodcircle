import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Entry } from '@/api/schemas/entry';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { FlowerFace } from '@/components/flower-face';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ENTRY_TAGS, INTENSITY_LABELS, emotionLabels, type Emotion } from '@/constants/emotions';
import { useCreateEntry, useEntries, useUpdateEntry } from '@/hooks/use-entries';
import { describeError } from '@/utils/error-message';
import { formatTime, localDate } from '@/utils/local-date';

import { EmotionPicker } from './emotion-picker';
import { IntensityBar } from './intensity-bar';

const NOTE_MAX = 500;
const DEFAULT_INTENSITY = 3;

interface LogMoodScreenProps {
  /** An entry of today to add details to. Without one, a new entry is logged from here. */
  entryId?: string;
  onBack: () => void;
  /** Called after saving; the route moves on to the insights. */
  onSaved: () => void;
}

/** Log a mood: how strong it was, what is behind it, and a note. */
export function LogMoodScreen({ entryId, onBack, onSaved }: LogMoodScreenProps) {
  const today = localDate();
  const entries = useEntries(today, today);
  const existing = entryId ? entries.data?.find((e) => e.id === entryId) : undefined;

  if (entryId && !existing) {
    // Waiting for today's entries, or the entry is gone (deleted, or from an earlier day).
    return (
      <Screen background="background" align="start">
        <View style={styles.header}>
          <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        </View>
        {entries.isPending ? (
          <ActivityIndicator style={styles.status} />
        ) : (
          <View style={styles.status}>
            <AppText color="textSecondary" style={styles.center}>
              {entries.isError
                ? 'Could not load this check-in.'
                : 'This check-in is no longer here.'}
            </AppText>
            {entries.isError ? (
              <Button title="Try again" variant="outline" onPress={() => void entries.refetch()} />
            ) : null}
          </View>
        )}
      </Screen>
    );
  }

  return <LogForm existing={existing} onBack={onBack} onSaved={onSaved} />;
}

interface LogFormProps {
  existing?: Entry;
  onBack: () => void;
  onSaved: () => void;
}

function LogForm({ existing, onBack, onSaved }: LogFormProps) {
  // The draft lives here, so a failed save (or a slow network) never costs the user what they typed.
  const [emotion, setEmotion] = useState<Emotion | null>(existing?.emotion ?? null);
  const [intensity, setIntensity] = useState(existing?.intensity ?? DEFAULT_INTENSITY);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateEntry();
  const update = useUpdateEntry();
  const saving = create.isPending || update.isPending;

  const toggleTag = (tag: string) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  const save = async () => {
    if (saving || !emotion) return;
    setError(null);
    try {
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          patch: { intensity, tags, note: note.trim() },
        });
      } else {
        await create.mutateAsync({
          emotion,
          intensity,
          tags,
          note: note.trim(),
          date: localDate(),
        });
      }
      onSaved();
    } catch (e) {
      setError(describeError(e, 'Could not save your entry. Please try again.'));
    }
  };

  const when = formatTime(existing?.createdAt ?? new Date().toISOString());

  return (
    <Screen background="background" align="start">
      <View style={styles.header}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        <AppText variant="button" style={styles.when} accessibilityRole="header">
          {`Today · ${when}`}
        </AppText>
        <View style={styles.headerSpace} />
      </View>

      {emotion ? (
        <View style={styles.hero}>
          <FlowerFace emotion={emotion} size={188} />
          <AppText variant="headlineLg" accessibilityRole="header">
            {emotionLabels[emotion]}
          </AppText>
        </View>
      ) : (
        <View style={styles.hero}>
          <AppText variant="headlineLg" accessibilityRole="header" style={styles.center}>
            How are you feeling?
          </AppText>
        </View>
      )}

      {existing ? null : <EmotionPicker value={emotion} onChange={setEmotion} />}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText variant="titleMd">How strong?</AppText>
          <AppText variant="bodySm" color="textSecondary">
            {INTENSITY_LABELS[intensity - 1]}
          </AppText>
        </View>
        <IntensityBar value={intensity} onChange={setIntensity} />
      </View>

      <View style={styles.section}>
        <AppText variant="titleMd">What&apos;s behind it?</AppText>
        <View style={styles.tags}>
          {ENTRY_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={tags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="titleMd">Add a note</AppText>
        <TextField
          label="Note"
          hideLabel
          value={note}
          onChangeText={setNote}
          placeholder="What made today feel this way?"
          multiline
          maxLength={NOTE_MAX}
          editable={!saving}
        />
      </View>

      <View style={styles.spacer} />

      {error ? (
        <AppText variant="label" color="danger" accessibilityRole="alert" style={styles.center}>
          {error}
        </AppText>
      ) : null}
      <Button title="Save entry" onPress={save} loading={saving} disabled={!emotion} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  when: { flex: 1, textAlign: 'center' },
  headerSpace: { width: 48 },
  hero: { alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 12 },
  center: { textAlign: 'center' },
  status: { marginTop: 48, gap: 16, alignItems: 'stretch' },
  section: { gap: 12, marginTop: 24 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spacer: { flex: 1, minHeight: 24 },
});
