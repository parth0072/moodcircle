import { Pressable, StyleSheet, View } from 'react-native';

import type { FeedItem } from '@/api/schemas/mood';
import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { emotionLabels } from '@/constants/emotions';
import { colors, emotionColors, fontFamily, radius } from '@/theme';
import { hugsOn, initialOf, posterName, timeAgo } from '@/utils/groups';

interface PostCardProps {
  item: FeedItem;
  myId: string | undefined;
  /** True while a hug is being sent or taken back. */
  hugBusy: boolean;
  onHug: () => void;
}

/** One member's post today: who, when, the mood, their words (if the group shows them), and hugs. */
export function PostCard({ item, myId, hugBusy, onHug }: PostCardProps) {
  const { count, mineId } = hugsOn(item, myId);
  const name = item.isOwn ? 'You' : posterName(item);
  const color = emotionColors[item.emotion];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar initial={initialOf(name)} color={color} size={38} fontSize={16} font="serif" />
        <View style={styles.who}>
          <AppText style={styles.name}>{name}</AppText>
          <AppText color="textSecondary" variant="caption">
            {timeAgo(item.createdAt)}
          </AppText>
        </View>
        <View style={[styles.pill, { backgroundColor: color }]}>
          <AppText style={styles.pillText}>{emotionLabels[item.emotion]}</AppText>
        </View>
      </View>

      {item.note ? <AppText style={styles.note}>{item.note}</AppText> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mineId !== null, disabled: hugBusy }}
          disabled={hugBusy}
          onPress={onHug}
          style={({ pressed }) => [
            styles.hug,
            mineId ? styles.hugOn : null,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText style={[styles.hugText, mineId ? styles.hugTextOn : null]}>
            {`Send a hug · ${count}`}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { flex: 1 },
  name: { fontFamily: fontFamily.body.bold },
  pill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  pillText: { fontFamily: fontFamily.display.semibold, fontSize: 14, lineHeight: 18 },
  note: { lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 8 },
  hug: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  hugOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  hugText: { fontFamily: fontFamily.body.medium, fontSize: 13, lineHeight: 18 },
  hugTextOn: { color: colors.onInk },
});
