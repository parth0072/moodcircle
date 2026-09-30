import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { useGroupOverview } from '@/hooks/use-groups';
import { usePrefsStore } from '@/stores/prefs-store';
import { useSessionStore } from '@/stores/session-store';
import { colors, radius } from '@/theme';
import { unreadCount } from '@/utils/groups';

import { GroupCard } from './group-card';

interface GroupsScreenProps {
  onBack: () => void;
  onJoin: () => void;
  onCreate: () => void;
  onOpenGroup: (groupId: string) => void;
}

/** "Your circles": the groups the person is in, how each feels today, and the ways to add one. */
export function GroupsScreen({ onBack, onJoin, onCreate, onOpenGroup }: GroupsScreenProps) {
  const overview = useGroupOverview();
  const myId = useSessionStore((s) => s.user?.id);
  const seen = usePrefsStore((s) => s.groupSeen);

  return (
    <Screen
      background="background"
      align="start"
      footer={<Button title="Create a group" icon="plus" onPress={onCreate} style={styles.cta} />}
    >
      <View style={styles.header}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Join with code"
          onPress={onJoin}
          style={({ pressed }) => [styles.join, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText variant="button" style={styles.joinText}>
            Join with code
          </AppText>
        </Pressable>
      </View>

      <AppText variant="headlineLg" accessibilityRole="header" style={styles.title}>
        Your circles
      </AppText>
      <AppText color="textSecondary" style={styles.intro}>
        Share how you feel with people who care. Only members can see posts.
      </AppText>

      {overview.isPending ? (
        <ActivityIndicator accessibilityLabel="Loading your circles" style={styles.status} />
      ) : overview.isError ? (
        <View style={styles.status}>
          <AppText color="textSecondary">Could not load your circles.</AppText>
          <Button title="Try again" variant="outline" onPress={() => void overview.refetch()} />
        </View>
      ) : overview.data.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="titleMd">No circles yet</AppText>
          <AppText color="textSecondary">
            Start one for people you trust, or join with a code a friend shared.
          </AppText>
        </View>
      ) : (
        // The cards sit 16 from the screen edge in the design, 8 wider than the text above them.
        <View style={styles.list}>
          {overview.data.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              unread={unreadCount(group, myId, seen[group.id])}
              onPress={() => onOpenGroup(group.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  join: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { fontSize: 15, lineHeight: 20 },
  title: { marginTop: 22 },
  intro: { marginTop: 8 },
  status: { marginTop: 32, gap: 16, alignItems: 'stretch' },
  empty: {
    marginTop: 28,
    gap: 6,
    padding: 18,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  list: { marginTop: 28, marginHorizontal: -8, gap: 14 },
  cta: { minHeight: 58 },
});
