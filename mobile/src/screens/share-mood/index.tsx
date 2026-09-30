import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { EMOTIONS, emotionLabels, type Emotion } from '@/constants/emotions';
import { POST_NOTE_MAX } from '@/constants/groups';
import { useEntries } from '@/hooks/use-entries';
import { useGroupOverview, usePostToGroup } from '@/hooks/use-groups';
import { fontFamily } from '@/theme';
import { describeError } from '@/utils/error-message';
import { pluralize } from '@/utils/groups';
import { localDate } from '@/utils/local-date';

import { EmotionTile } from './emotion-tile';
import { GroupChoiceRow } from './group-choice-row';

/** What is selected when nothing was logged today: the design starts on Calm. */
const DEFAULT_EMOTION: Emotion = 'calm';

interface ShareMoodScreenProps {
  /** The group the person came from: it starts ticked. */
  initialGroupId?: string;
  onClose: () => void;
  /** Called once every ticked group has the post. */
  onDone: () => void;
}

/** "Share to groups": one mood and a few words, posted to every group that is ticked. */
export function ShareMoodScreen({ initialGroupId, onClose, onDone }: ShareMoodScreenProps) {
  const today = localDate();
  const groups = useGroupOverview();
  const entries = useEntries(today, today);
  const post = usePostToGroup();
  const [picked, setPicked] = useState<Emotion | null>(null);
  const [note, setNote] = useState('');
  // Null until the person ticks something: then the group they came from is the one ticked.
  const [ticked, setTicked] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);

  // The mood already logged today (the newest entry) is what people most likely want to share.
  const loggedToday = entries.data?.[entries.data.length - 1]?.emotion;
  const emotion = picked ?? loggedToday ?? DEFAULT_EMOTION;
  const available = groups.data ?? [];
  const selected = (ticked ?? (initialGroupId ? [initialGroupId] : [])).filter((id) =>
    available.some((g) => g.id === id),
  );

  const toggle = (groupId: string) =>
    setTicked(
      selected.includes(groupId) ? selected.filter((id) => id !== groupId) : [...selected, groupId],
    );

  const submit = async () => {
    if (busy || selected.length === 0) return;
    setBusy(true);
    setFailures([]);
    const results = await Promise.allSettled(
      selected.map((groupId) => post.mutateAsync({ groupId, emotion, note })),
    );
    setBusy(false);

    const stillTicked: string[] = [];
    const problems: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;
      const groupId = selected[index];
      stillTicked.push(groupId);
      const name = available.find((g) => g.id === groupId)?.name ?? 'a group';
      problems.push(`${name}: ${describeError(result.reason, 'could not be shared.')}`);
    });
    if (problems.length === 0) return onDone();
    // Keep the ones that failed ticked so "Post" tries only those again.
    setTicked(stillTicked);
    setFailures(problems);
  };

  const label =
    selected.length === 0
      ? 'Pick a group to share with'
      : `Post ${emotionLabels[emotion]} to ${pluralize(selected.length, 'group')}`;

  return (
    <Screen
      background="background"
      align="start"
      footer={
        <Button
          title={label}
          onPress={submit}
          disabled={selected.length === 0}
          loading={busy}
          style={styles.cta}
        />
      }
    >
      <View style={styles.header}>
        <RoundButton icon="x" label="Close" onPress={onClose} />
        <AppText variant="button" style={styles.headerTitle}>
          Share to groups
        </AppText>
        <View style={styles.headerSpace} />
      </View>

      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        How are you, right now?
      </AppText>

      <View accessibilityRole="radiogroup" accessibilityLabel="How are you?" style={styles.tiles}>
        {[EMOTIONS.slice(0, 3), EMOTIONS.slice(3)].map((row) => (
          <View key={row[0]} style={styles.tileRow}>
            {row.map((e) => (
              <EmotionTile
                key={e}
                emotion={e}
                selected={e === emotion}
                onPress={() => setPicked(e)}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <AppText variant="titleMd">
          Add a few words{' '}
          <AppText color="textSecondary" style={styles.optional}>
            optional
          </AppText>
        </AppText>
        <TextField
          label="Add a few words"
          hideLabel
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="What's on your mind?"
          maxLength={POST_NOTE_MAX}
          editable={!busy}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="titleMd">Share with</AppText>
        {groups.isPending ? null : available.length === 0 ? (
          <AppText color="textSecondary">
            You are not in a group yet. Start one or join with a code from the Groups screen.
          </AppText>
        ) : (
          <View style={styles.groups}>
            {available.map((group) => (
              <GroupChoiceRow
                key={group.id}
                group={group}
                checked={selected.includes(group.id)}
                onToggle={() => toggle(group.id)}
              />
            ))}
          </View>
        )}
      </View>

      {groups.isError ? (
        <AppText color="danger" accessibilityRole="alert" style={styles.problem}>
          {describeError(groups.error, 'Could not load your groups.')}
        </AppText>
      ) : null}
      {failures.map((failure) => (
        <AppText key={failure} color="danger" accessibilityRole="alert" style={styles.problem}>
          {failure}
        </AppText>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22 },
  headerSpace: { width: 48 },
  title: { marginTop: 22, fontSize: 32, lineHeight: 36, letterSpacing: -0.4 },
  // The tiles sit 16 from the screen edge in the design, 8 wider than the text above them.
  tiles: { marginTop: 18, marginHorizontal: -8, gap: 10 },
  tileRow: { flexDirection: 'row', gap: 10 },
  section: { marginTop: 22, gap: 8 },
  optional: { fontFamily: fontFamily.body.regular, fontSize: 13, lineHeight: 18 },
  groups: { gap: 10 },
  problem: { marginTop: 12 },
  cta: { minHeight: 58 },
});
