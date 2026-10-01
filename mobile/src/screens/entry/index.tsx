import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { MoodBadge } from '@/components/mood-badge';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { entryTypeLabels, REPLY_MAX } from '@/constants/journal';
import {
  useAddJournalReply,
  useDeleteJournalReply,
  useJournalEntry,
  useSetJournalLove,
} from '@/hooks/use-journal';
import { colors, radius } from '@/theme';
import { describeError } from '@/utils/error-message';
import { longDay } from '@/utils/journal-dates';
import { formatTime } from '@/utils/local-date';
import { personName, sharedWithLabel } from '@/utils/people';

import { ActionPill } from './action-pill';
import { PhotoCarousel } from './photo-carousel';
import { ReplyCard } from './reply-card';
import { ShareBar } from './share-bar';

interface EntryScreenProps {
  entryId: string;
  onBack: () => void;
  onEdit: (entryId: string) => void;
  onShare: (entryId: string) => void;
}

const HERO_HEIGHT = 360;
// The cream sheet rides up over the bottom of the photo.
const SHEET_OVERLAP = 24;

/**
 * One entry on its own page: the photos, the words, and what friends said about it. The owner can
 * change or share it; someone it was shared with can love it and reply.
 */
export function EntryScreen({ entryId, onBack, onEdit, onShare }: EntryScreenProps) {
  const insets = useSafeAreaInsets();
  const entry = useJournalEntry(entryId);
  const love = useSetJournalLove();
  const reply = useAddJournalReply();
  const removeReply = useDeleteJournalReply();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!entry.data) {
    const gone = isApiError(entry.error) && entry.error.code === 'JOURNAL_NOT_FOUND';
    return (
      <Screen background="background" align="start">
        <View style={styles.simpleHeader}>
          <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        </View>
        {entry.isError ? (
          <View style={styles.status}>
            <AppText color="textSecondary">
              {gone
                ? 'This entry is no longer here. It may have been deleted, or the person stopped sharing it.'
                : describeError(entry.error, 'Could not load that entry.')}
            </AppText>
            {gone ? null : (
              <Button title="Try again" variant="outline" onPress={() => void entry.refetch()} />
            )}
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading the entry" style={styles.status} />
        )}
      </Screen>
    );
  }

  const data = entry.data;
  const hasPhotos = data.photos.length > 0;
  // Over a photo the buttons sit on a cream disc; on the plain page they have the outlined look.
  const tone = hasPhotos ? 'scrim' : 'light';
  const owner = personName(data.owner);
  const when =
    data.type === 'note'
      ? `${longDay(data.createdAt)}, ${formatTime(data.createdAt)}`
      : longDay(data.createdAt);
  const loveLabel = `${data.loves.mine ? 'Loved' : 'Love'}${
    data.loves.count > 0 ? ` · ${data.loves.count}` : ''
  }`;

  const toggleLove = async () => {
    setError(null);
    try {
      await love.mutateAsync({ id: data.id, on: !data.loves.mine });
    } catch (e) {
      setError(describeError(e, 'Could not do that. Please try again.'));
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    setError(null);
    try {
      await reply.mutateAsync({ id: data.id, body: text });
      setText('');
      setReplying(false);
    } catch (e) {
      setError(describeError(e, 'Could not send that. Please try again.'));
    }
  };

  const deleteReply = async (replyId: string) => {
    setError(null);
    try {
      await removeReply.mutateAsync({ id: data.id, replyId });
    } catch (e) {
      setError(describeError(e, 'Could not delete that. Please try again.'));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
      >
        {hasPhotos ? (
          <PhotoCarousel photos={data.photos} height={HERO_HEIGHT} />
        ) : (
          // No photo: leave room for the buttons that float at the top.
          <View style={{ height: insets.top + 6 + 48 + 8 }} />
        )}
        <View style={[styles.sheet, hasPhotos ? { marginTop: -SHEET_OVERLAP } : null]}>
          <View style={styles.metaRow}>
            <MoodBadge emotion={data.emotion} size="md" />
            <AppText variant="bodySm" color="textSecondary">
              {`${entryTypeLabels[data.type]} · ${when}`}
            </AppText>
          </View>
          <AppText variant="headline" accessibilityRole="header" style={styles.title}>
            {data.title}
          </AppText>
          {data.body ? <AppText style={styles.body}>{data.body}</AppText> : null}

          {data.sharedMessage ? (
            <ReplyCard authorId={data.owner.id} authorName={owner} body={data.sharedMessage} />
          ) : null}
          {data.replies.map((r) => (
            <ReplyCard
              key={r.id}
              authorId={r.author.id}
              authorName={r.isMine ? 'You' : personName(r.author)}
              body={r.body}
              onDelete={r.isMine || data.isMine ? () => void deleteReply(r.id) : undefined}
            />
          ))}

          <View style={styles.actions}>
            <ActionPill
              label={loveLabel}
              active={data.loves.mine}
              disabled={love.isPending}
              onPress={() => void toggleLove()}
            />
            <ActionPill label="Reply" active={replying} onPress={() => setReplying((on) => !on)} />
          </View>

          {replying ? (
            <View style={styles.composer}>
              <TextField
                label="Your reply"
                hideLabel
                multiline
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder="Write a reply"
                maxLength={REPLY_MAX}
                editable={!reply.isPending}
              />
              <Button
                title="Send reply"
                onPress={() => void send()}
                disabled={!text.trim()}
                loading={reply.isPending}
                style={styles.send}
              />
            </View>
          ) : null}

          {error ? (
            <AppText color="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.header, { top: insets.top + 6 }]} pointerEvents="box-none">
        <RoundButton icon="chevron-left" label="Back" tone={tone} onPress={onBack} />
        {data.isMine ? (
          <View style={styles.owner}>
            <RoundButton
              icon="edit"
              label="Edit entry"
              tone={tone}
              onPress={() => onEdit(data.id)}
            />
            <RoundButton
              icon="share"
              label="Share entry"
              tone={tone}
              onPress={() => onShare(data.id)}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.bar, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
        <ShareBar
          text={
            data.isMine
              ? data.sharedWith.length > 0
                ? sharedWithLabel(data.sharedWith)
                : 'Private to you'
              : `From ${owner}`
          }
          people={data.isMine ? data.sharedWith : [data.owner]}
          onShare={data.isMine ? () => onShare(data.id) : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // Room under the content for the pinned bar.
  content: { paddingBottom: 140 },
  sheet: {
    gap: 12,
    paddingTop: 22,
    paddingHorizontal: 24,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  body: { lineHeight: 23, color: colors.bodyInk },
  actions: { flexDirection: 'row', gap: 8 },
  composer: { gap: 10 },
  send: { minHeight: 48 },
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  owner: { flexDirection: 'row', gap: 10 },
  bar: { position: 'absolute', left: 16, right: 16 },
  simpleHeader: { flexDirection: 'row', alignItems: 'center' },
  status: { marginTop: 32, gap: 16, alignItems: 'stretch' },
});
