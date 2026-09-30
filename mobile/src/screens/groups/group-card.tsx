import { Pressable, StyleSheet, View } from 'react-native';

import type { OverviewGroup } from '@/api/schemas/group';
import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { GroupTile } from '@/components/group-tile';
import { colors, emotionColors, fontFamily, radius } from '@/theme';
import { circleMeta, circleSummary, memberStack, moodBar } from '@/utils/groups';

interface GroupCardProps {
  group: OverviewGroup;
  /** Posts by others since the person last opened the group. */
  unread: number;
  onPress: () => void;
}

/** One circle on "Your circles": its tile and name, who is in it and how they feel today. */
export function GroupCard({ group, unread, onPress }: GroupCardProps) {
  const { members, extra } = memberStack(group);
  const bar = moodBar(group);
  const meta = circleMeta(group);
  const summary = circleSummary(group);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}. ${meta}. ${summary}${unread > 0 ? `. ${unread} new` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.top}>
        <GroupTile
          name={group.name}
          color={group.color}
          size={48}
          cornerRadius={16}
          fontSize={20}
        />
        <View style={styles.titles}>
          <AppText variant="titleMd" numberOfLines={1}>
            {group.name}
          </AppText>
          <AppText color="textSecondary" style={styles.small}>
            {meta}
          </AppText>
        </View>
        {unread > 0 ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{unread}</AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.middle}>
        <View style={styles.stack}>
          {members.map((member, index) => (
            <View key={member.id} style={index > 0 ? styles.overlap : null}>
              <Avatar
                initial={member.initial}
                color={member.emotion ? emotionColors[member.emotion] : colors.notYet}
                size={39}
                fontSize={13}
                ringWidth={2.5}
                ringColor={colors.surface}
                muted={!member.emotion}
              />
            </View>
          ))}
          {extra > 0 ? (
            <View style={members.length > 0 ? styles.overlap : null}>
              <Avatar
                initial={`+${extra}`}
                color={colors.notYet}
                size={39}
                fontSize={12}
                ringWidth={2.5}
                ringColor={colors.surface}
                muted
              />
            </View>
          ) : null}
        </View>
        <AppText color="textSecondary" style={styles.small}>
          {summary}
        </AppText>
      </View>

      <View style={styles.bar}>
        {bar.map((segment, index) => (
          <View
            key={`${segment.emotion ?? 'none'}-${index}`}
            style={{
              flexGrow: segment.count,
              backgroundColor: segment.emotion ? emotionColors[segment.emotion] : colors.notYet,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  small: { fontSize: 13, lineHeight: 18 },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily.body.bold },
  middle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stack: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
});
