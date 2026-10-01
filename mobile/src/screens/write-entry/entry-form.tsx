import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { JournalEntryDetail } from '@/api/schemas/journal';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ConfirmCard } from '@/components/confirm-card';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import type { Emotion } from '@/constants/emotions';
import {
  BODY_MAX,
  ENTRY_TYPES,
  entryTypeLabels,
  HEAVY_EMOTIONS,
  PHOTOS_MAX,
  TITLE_MAX,
  WRITING_PROMPTS,
  type EntryType,
} from '@/constants/journal';
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useUpdateJournalEntry,
} from '@/hooks/use-journal';
import { usePhotoDraft } from '@/hooks/use-photo-draft';
import { colors, fontFamily, type } from '@/theme';
import { describeError } from '@/utils/error-message';
import { pickPhotos } from '@/utils/pick-photos';
import { sharedWithLabel } from '@/utils/people';

import { HeavyDayBanner } from './heavy-day-banner';
import { MoodChips } from './mood-chips';
import { PhotoTiles } from './photo-tiles';
import { PrivacyRow } from './privacy-row';
import { PromptChip } from './prompt-chip';

interface EntryFormProps {
  /** The entry being changed; omitted when writing a new one. */
  entry?: JournalEntryDetail;
  /** What a new entry starts as. */
  initialType: EntryType;
  onClose: () => void;
  /** Saved and kept private. */
  onSaved: (entryId: string) => void;
  /** Saved, and the person wants to choose who sees it. */
  onShare: (entryId: string) => void;
  /** "Change" on an entry that is already shared: opens the share screen over the form, which keeps its edits. */
  onChangeSharing: (entryId: string) => void;
  onDeleted: () => void;
}

const TYPE_OPTIONS = ENTRY_TYPES.map((value) => ({ value, label: entryTypeLabels[value] }));

const BODY_HINT: Record<EntryType, string> = {
  note: 'What is weighing on you?',
  memory: 'What do you want to remember?',
};

/** "Write a note or memory": the design's writing screen, for a new entry or one being changed. */
export function EntryForm({
  entry,
  initialType,
  onClose,
  onSaved,
  onShare,
  onChangeSharing,
  onDeleted,
}: EntryFormProps) {
  const create = useCreateJournalEntry();
  const update = useUpdateJournalEntry();
  const remove = useDeleteJournalEntry();
  const photos = usePhotoDraft(entry?.photos);
  const [entryType, setEntryType] = useState<EntryType>(entry?.type ?? initialType);
  const [emotion, setEmotion] = useState<Emotion | null>(entry?.emotion ?? null);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyInput = useRef<TextInput>(null);

  const saving = create.isPending || update.isPending;
  const hasWords = title.trim() !== '';
  const canSave = emotion !== null && hasWords && !photos.uploading && !photos.failed && !saving;

  // Whether closing would lose something: any content for a new entry, any change to an old one.
  const changed = entry
    ? entryType !== entry.type ||
      emotion !== entry.emotion ||
      title.trim() !== entry.title ||
      body.trim() !== entry.body ||
      photos.ids.join() !== entry.photos.map((p) => p.id).join()
    : hasWords || body.trim() !== '' || photos.photos.length > 0;

  const addPrompt = (prompt: string) => {
    setBody((text) =>
      (text.trim() ? `${text.trimEnd()}\n\n${prompt} ` : `${prompt} `).slice(0, BODY_MAX),
    );
    bodyInput.current?.focus();
  };

  const addPhotos = async () => {
    setError(null);
    try {
      photos.add(await pickPhotos(PHOTOS_MAX - photos.photos.length));
    } catch {
      setError('Could not open your photos. Please try again.');
    }
  };

  const save = async () => {
    if (!canSave || emotion === null) return;
    setError(null);
    const fields = { type: entryType, emotion, title, body, photoIds: photos.ids };
    try {
      const saved = entry
        ? await update.mutateAsync({ id: entry.id, changes: fields })
        : await create.mutateAsync(fields);
      if (share) onShare(saved.id);
      else onSaved(saved.id);
    } catch (e) {
      // Nothing was saved: the draft stays exactly as it is.
      setError(describeError(e, 'Could not save that. Please try again.'));
    }
  };

  const destroy = async () => {
    if (!entry) return;
    setError(null);
    try {
      await remove.mutateAsync(entry.id);
      onDeleted();
    } catch (e) {
      setConfirm(null);
      setError(describeError(e, 'Could not delete that. Please try again.'));
    }
  };

  const saveLabel = share ? 'Next: choose friends' : entry ? 'Save changes' : `Save ${entryType}`;
  const alreadyShared = entry && entry.sharedWith.length > 0 ? entry : null;

  // A question replaces the Save button where the thumb is, so it is never scrolled out of sight.
  const footer =
    confirm === 'discard' ? (
      <ConfirmCard
        message="Discard what you wrote?"
        confirmLabel="Discard"
        cancelLabel="Keep writing"
        onConfirm={onClose}
        onCancel={() => setConfirm(null)}
      />
    ) : confirm === 'delete' ? (
      <ConfirmCard
        message="Delete this entry? Its photos go with it, and so does anything shared."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => void destroy()}
        onCancel={() => setConfirm(null)}
      />
    ) : (
      <Button
        title={saveLabel}
        onPress={() => void save()}
        disabled={!canSave}
        loading={saving}
        style={styles.cta}
      />
    );

  return (
    <Screen background="background" align="start" footer={footer}>
      <View style={styles.header}>
        <RoundButton
          icon="x"
          label="Close"
          onPress={() => (changed ? setConfirm('discard') : onClose())}
        />
        <View style={styles.type}>
          <SegmentedControl
            label="Entry type"
            options={TYPE_OPTIONS}
            value={entryType}
            onChange={setEntryType}
          />
        </View>
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.moods}>
        <MoodChips value={emotion} onChange={setEmotion} />
      </View>

      <View style={styles.writing}>
        <TextInput
          accessibilityLabel="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          maxLength={TITLE_MAX}
          returnKeyType="next"
          onSubmitEditing={() => bodyInput.current?.focus()}
          style={styles.titleInput}
        />
        <TextInput
          ref={bodyInput}
          accessibilityLabel="Entry"
          value={body}
          onChangeText={setBody}
          placeholder={BODY_HINT[entryType]}
          placeholderTextColor={colors.placeholder}
          maxLength={BODY_MAX}
          multiline
          style={styles.bodyInput}
        />
        <View style={styles.prompts}>
          {WRITING_PROMPTS.map((prompt) => (
            <PromptChip key={prompt} label={prompt} onPress={() => addPrompt(prompt)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="titleMd" style={styles.sectionTitle}>
          Photos
        </AppText>
        <PhotoTiles
          photos={photos.photos}
          full={photos.full}
          onAdd={() => void addPhotos()}
          onRemove={photos.remove}
          onRetry={photos.retry}
        />
        {photos.failed ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            A photo did not upload. Retry it or remove it to save.
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        {emotion && HEAVY_EMOTIONS.includes(emotion) && !share && !alreadyShared ? (
          <HeavyDayBanner onTell={() => setShare(true)} />
        ) : null}
        <PrivacyRow
          share={share}
          onChange={setShare}
          sharedLabel={alreadyShared ? sharedWithLabel(alreadyShared.sharedWith) : undefined}
          onChangeSharing={alreadyShared ? () => onChangeSharing(alreadyShared.id) : undefined}
        />
      </View>

      {!emotion || !hasWords ? (
        <AppText variant="caption" color="textSecondary" style={styles.hint}>
          Pick a mood and add a title to save.
        </AppText>
      ) : null}
      {error ? (
        <AppText color="danger" accessibilityRole="alert" style={styles.hint}>
          {error}
        </AppText>
      ) : null}

      {entry ? (
        <View style={styles.section}>
          <Button
            title="Delete entry"
            variant="danger"
            onPress={() => setConfirm('delete')}
            style={styles.delete}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  type: { flex: 1, alignItems: 'center' },
  headerSpace: { width: 48 },
  // The mood pills start 16 from the screen edge and run past the other edge.
  moods: { marginTop: 18, marginHorizontal: -24 },
  writing: { marginTop: 14, gap: 10 },
  titleInput: {
    fontFamily: fontFamily.display.bold,
    fontSize: 26,
    lineHeight: 32,
    minHeight: 44,
    paddingVertical: 0,
    color: colors.text,
    outlineWidth: 0,
  },
  bodyInput: {
    ...type.input,
    lineHeight: 25,
    minHeight: 120,
    paddingVertical: 0,
    color: colors.text,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { marginTop: 18, gap: 10 },
  sectionTitle: { fontSize: 17, lineHeight: 22 },
  hint: { marginTop: 12 },
  delete: { minHeight: 48 },
  cta: { minHeight: 58 },
});
