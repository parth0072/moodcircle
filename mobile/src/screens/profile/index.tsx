import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { RoundButton } from '@/components/round-button';
import { TextButton } from '@/components/text-button';
import { emotionLabels } from '@/constants/emotions';
import { useEntryStats } from '@/hooks/use-entries';
import { useReminder, useSetReminder } from '@/hooks/use-reminder';
import { useSignOut } from '@/hooks/use-sign-out';
import { useSessionStore } from '@/stores/session-store';
import { accents, colors, emotionColors, fontFamily, radius } from '@/theme';
import { localDate, sinceLabel } from '@/utils/local-date';
import { REMINDER_LABEL } from '@/utils/reminder';

interface ProfileScreenProps {
  onBack: () => void;
  onEdit: () => void;
}

function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View
      style={[styles.tile, { backgroundColor: color }]}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <AppText variant="stat">{value}</AppText>
      <AppText variant="bodySm" color="textSoft">
        {label}
      </AppText>
    </View>
  );
}

/** Profile: who you are, your totals, the daily reminder, and Log out. */
export function ProfileScreen({ onBack, onEdit }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const today = localDate();
  const stats = useEntryStats(today);
  const reminder = useReminder();
  const setReminder = useSetReminder();
  const signOut = useSignOut();

  const name = user?.name ?? '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const s = stats.data;
  // Web has no local notifications; on a phone the row is always shown.
  const reminderAvailable = process.env.EXPO_OS !== 'web';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <RoundButton icon="chevron-left" label="Back" tone="glass" onPress={onBack} />
            <AppText
              variant="title"
              color="onBrand"
              accessibilityRole="header"
              style={styles.headerTitle}
            >
              Profile
            </AppText>
            <RoundButton icon="edit" label="Edit profile" tone="glass" onPress={onEdit} />
          </View>
          <View style={styles.avatar} accessibilityLabel={`Avatar for ${name}`}>
            <AppText variant="display" style={styles.avatarText}>
              {user?.avatar || initial}
            </AppText>
          </View>
        </View>

        <View style={styles.identity}>
          <AppText variant="stat" style={styles.name}>
            {name}
          </AppText>
          <AppText color="textSecondary">
            {stats.isPending ? ' ' : sinceLabel(s?.firstEntryDate ?? null, today)}
          </AppText>
        </View>

        <View style={styles.tiles}>
          <StatTile
            value={s ? String(s.currentStreak) : '–'}
            label="Day streak"
            color={accents.sun}
          />
          <StatTile
            value={s ? String(s.total) : '–'}
            label="Check-ins"
            color={emotionColors.calm}
          />
          <StatTile
            value={s?.topEmotion ? emotionLabels[s.topEmotion] : '–'}
            label="Top mood"
            color={emotionColors.joy}
          />
        </View>
        {stats.isError ? (
          <View style={styles.statsError}>
            <AppText variant="bodySm" color="textSecondary">
              Could not load your totals.
            </AppText>
            <TextButton title="Try again" size="medium" onPress={() => void stats.refetch()} />
          </View>
        ) : null}

        {reminderAvailable ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconTile}>
                <Icon name="bell" size={18} color={colors.brand} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="bodyStrong" style={styles.rowTitle}>
                  Daily reminder
                </AppText>
                <AppText variant="bodySm" color="textSecondary">
                  {reminder.data ? REMINDER_LABEL : 'Off'}
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Daily reminder"
                value={!!reminder.data}
                disabled={reminder.isPending || setReminder.isPending}
                onValueChange={(on) => setReminder.mutate(on)}
                trackColor={{ false: colors.switchOff, true: colors.brand }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.switchOff}
              />
            </View>
            {setReminder.data === 'denied' ? (
              <AppText
                variant="caption"
                color="danger"
                accessibilityRole="alert"
                style={styles.denied}
              >
                Notifications are turned off for this app. Turn them on in your phone&apos;s
                Settings to get a reminder.
              </AppText>
            ) : null}
            {setReminder.isError ? (
              <AppText
                variant="caption"
                color="danger"
                accessibilityRole="alert"
                style={styles.denied}
              >
                Could not change the reminder. Please try again.
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.logout}>
          <Button title="Log out" variant="danger" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: colors.brand,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamily.body.medium, fontSize: 17 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    backgroundColor: emotionColors.joy,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 40, lineHeight: 48, letterSpacing: 0 },
  identity: { alignItems: 'center', gap: 4, marginTop: 14 },
  name: { fontSize: 26, lineHeight: 32 },
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 24 },
  tile: {
    flex: 1,
    height: 84,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statsError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fontFamily.body.medium },
  denied: { paddingHorizontal: 16, paddingBottom: 12 },
  logout: { paddingHorizontal: 16, marginTop: 24 },
});
