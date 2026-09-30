import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { useGroupDetail, useGroupFeed, useToggleHug } from '@/hooks/use-groups';
import { usePrefsStore } from '@/stores/prefs-store';
import { useSessionStore } from '@/stores/session-store';
import { colors, fontFamily } from '@/theme';
import { describeError } from '@/utils/error-message';
import { hugsOn, moodHeadline, pluralize, rightNow } from '@/utils/groups';
import { shareInvite } from '@/utils/share-invite';

import { PostCard } from './post-card';
import { RightNowRow } from './right-now-row';

interface GroupFeedScreenProps {
  groupId: string;
  onBack: () => void;
  onShare: (groupId: string) => void;
}

/** One group: who is in it and how they feel right now, and today's posts. */
export function GroupFeedScreen({ groupId, onBack, onShare }: GroupFeedScreenProps) {
  const insets = useSafeAreaInsets();
  const myId = useSessionStore((s) => s.user?.id);
  const detail = useGroupDetail(groupId);
  const feed = useGroupFeed(groupId);
  const hug = useToggleHug();
  const markSeen = usePrefsStore((s) => s.markGroupSeen);

  const group = detail.data?.group;
  const posts = [...(feed.data?.feed ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const newestPostAt = posts[0]?.createdAt;

  // Looking at the feed is what clears the "new" badge on the groups list.
  useEffect(() => {
    if (newestPostAt) void markSeen(groupId, newestPostAt);
  }, [groupId, newestPostAt, markSeen]);

  const refreshing = detail.isRefetching || feed.isRefetching;
  const refresh = () => {
    void detail.refetch();
    void feed.refetch();
  };

  const toggleHug = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) hug.mutate({ moodId: post.id, reactionId: hugsOn(post, myId).mineId });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon="chevron-left" label="Back" tone="glass" onPress={onBack} />
        <View style={styles.titles}>
          <AppText
            variant="titleLg"
            color="onBrand"
            numberOfLines={1}
            accessibilityRole="header"
            style={styles.name}
          >
            {group?.name ?? ' '}
          </AppText>
          <AppText color="onBrand" style={styles.meta}>
            {group ? `${pluralize(group.memberCount, 'member')} · code ${group.inviteCode}` : ' '}
          </AppText>
        </View>
        <RoundButton
          icon="user-plus"
          label="Invite people"
          tone="glass"
          onPress={() => group && void shareInvite(group.name, group.inviteCode)}
        />
      </View>

      <AppText color="onBrand" style={styles.rightNow}>
        Right now
      </AppText>
      <View style={styles.membersRow}>
        {detail.data ? (
          <RightNowRow members={rightNow(detail.data.members, feed.data?.feed ?? [], myId)} />
        ) : null}
      </View>

      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View style={styles.todayRow}>
            <AppText variant="titleLg" accessibilityRole="header">
              Today
            </AppText>
            <AppText color="textSecondary" style={styles.headline}>
              {moodHeadline(feed.data?.feed ?? [])}
            </AppText>
          </View>

          {detail.isError || feed.isError ? (
            <View style={styles.status}>
              <AppText color="textSecondary">
                {describeError(detail.error ?? feed.error, 'Could not load this group.')}
              </AppText>
              <Button title="Try again" variant="outline" onPress={refresh} />
            </View>
          ) : feed.isPending || detail.isPending ? (
            <ActivityIndicator accessibilityLabel="Loading the group" style={styles.status} />
          ) : posts.length === 0 ? (
            <AppText color="textSecondary" style={styles.empty}>
              Nobody has shared yet today. Be the first: tap Share how you feel.
            </AppText>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                item={post}
                myId={myId}
                hugBusy={hug.isPending}
                onHug={() => toggleHug(post.id)}
              />
            ))
          )}

          {hug.isError ? (
            <AppText color="danger" accessibilityRole="alert" style={styles.hugError}>
              {describeError(hug.error, 'Could not send that. Please try again.')}
            </AppText>
          ) : null}
        </ScrollView>
      </View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
        pointerEvents="box-none"
      >
        <Button
          title="Share how you feel"
          icon="plus"
          onPress={() => onShare(groupId)}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  titles: { flex: 1 },
  name: { fontSize: 22, lineHeight: 28 },
  meta: { fontSize: 13, lineHeight: 18, opacity: 0.8 },
  rightNow: {
    marginTop: 30,
    marginLeft: 24,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
    fontFamily: fontFamily.body.bold,
  },
  membersRow: { marginTop: 10, minHeight: 100 },
  sheet: {
    flex: 1,
    marginTop: 28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  sheetContent: { gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 130 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headline: { fontSize: 13, lineHeight: 18 },
  status: { marginTop: 12, gap: 16, alignItems: 'stretch' },
  empty: { paddingHorizontal: 8, paddingTop: 8 },
  hugError: { paddingHorizontal: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
  cta: { minHeight: 58, boxShadow: '0 10px 24px rgba(30, 42, 90, 0.35)' },
});
