import { Pressable, StyleSheet, View } from 'react-native';

import type { JournalEntry } from '@/api/schemas/journal';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { MoodBadge } from '@/components/mood-badge';
import { Photo } from '@/components/photo';
import { emotionLabels } from '@/constants/emotions';
import { colors, emotionColors, fontFamily, radius } from '@/theme';
import { dayLabel, entryMeta } from '@/utils/journal-dates';
import { personName, sharedWithLabel } from '@/utils/people';

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
}

/** A memory with several photos gets the big picture across the top; one photo is a thumbnail. */
const BIG_PICTURE_FROM = 2;

/** Who else is in this entry: "Shared with Kabir", "From Kabir", or nothing for a private one. */
function sharingLine(entry: JournalEntry): string | null {
  if (!entry.isMine) return `From ${personName(entry.owner)}`;
  return entry.sharedWith.length > 0 ? sharedWithLabel(entry.sharedWith) : null;
}

/** One entry in the journal list, in the design's three shapes: big photo, note, and thumbnail. */
export function EntryCard({ entry, onPress }: EntryCardProps) {
  const sharing = sharingLine(entry);
  const spoken = [
    entry.title,
    `${emotionLabels[entry.emotion]} ${entry.type}`,
    entryMeta(entry),
    sharing ?? 'Private',
  ].join('. ');

  const shared = sharing ? (
    <View style={styles.sharing}>
      <Icon name="person" size={14} color={colors.found} strokeWidth={2.4} />
      <AppText variant="bodySm" style={styles.sharingText}>
        {sharing}
      </AppText>
    </View>
  ) : null;

  const press = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: spoken,
    onPress,
  };

  if (entry.type === 'memory' && entry.photos.length >= BIG_PICTURE_FROM) {
    return (
      <Pressable {...press} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
        <Photo uri={entry.photos[0].url} style={styles.bigPhoto} />
        <View style={styles.bigBody}>
          <View style={styles.metaRow}>
            <MoodBadge emotion={entry.emotion} />
            <AppText variant="caption" color="textSecondary">
              {entryMeta(entry)}
            </AppText>
          </View>
          <AppText variant="titleMd" style={styles.title} numberOfLines={2}>
            {entry.title}
          </AppText>
          {shared}
        </View>
      </Pressable>
    );
  }

  if (entry.type === 'memory') {
    return (
      <Pressable
        {...press}
        style={({ pressed }) => [styles.card, styles.thumbCard, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Photo
          uri={entry.photos[0]?.url ?? null}
          fallbackColor={emotionColors[entry.emotion]}
          style={styles.thumb}
        />
        <View style={styles.thumbBody}>
          <View style={styles.metaRow}>
            <MoodBadge emotion={entry.emotion} />
            <AppText variant="caption" color="textSecondary">
              {dayLabel(entry.createdAt)}
            </AppText>
          </View>
          <AppText variant="titleMd" style={styles.thumbTitle} numberOfLines={2}>
            {entry.title}
          </AppText>
          {shared ?? (
            <AppText variant="bodySm" color="textSecondary">
              Private
            </AppText>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...press}
      style={({ pressed }) => [styles.card, styles.noteCard, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.metaRow}>
        <MoodBadge emotion={entry.emotion} />
        <AppText variant="caption" color="textSecondary" style={styles.noteMeta}>
          {entryMeta(entry)}
        </AppText>
        {entry.isMine && !sharing ? (
          <Icon name="lock" size={16} color={colors.textSecondary} />
        ) : null}
      </View>
      <AppText variant="titleMd" style={styles.title} numberOfLines={2}>
        {entry.title}
      </AppText>
      {entry.excerpt ? (
        <AppText variant="bodySm" color="textSoft" numberOfLines={2} style={styles.excerpt}>
          {entry.excerpt}
        </AppText>
      ) : null}
      {shared}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, lineHeight: 24 },
  bigPhoto: { height: 132, width: '100%' },
  bigBody: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  noteCard: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  noteMeta: { flex: 1 },
  excerpt: { lineHeight: 20 },
  thumbCard: { flexDirection: 'row', gap: 12, padding: 12 },
  thumb: { width: 84, height: 84, borderRadius: 16, borderCurve: 'continuous' },
  thumbBody: { flex: 1, gap: 6, minWidth: 0 },
  thumbTitle: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.display.semibold },
  sharing: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sharingText: { color: colors.found },
});
