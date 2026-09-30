import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Svg from 'react-native-svg';

import { isApiError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Flower } from '@/components/flower';
import { Icon } from '@/components/icon';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { DEFAULT_AUTO_SHARE, MIN_CODE_LENGTH } from '@/constants/groups';
import { useDebounced } from '@/hooks/use-debounced';
import { useGroupPreview, useJoinGroup } from '@/hooks/use-groups';
import { colors, emotionColors, fontFamily, radius } from '@/theme';
import { describeError } from '@/utils/error-message';
import { normalizeCode } from '@/utils/groups';

import { CodeField } from './code-field';
import { GroupPreviewCard } from './group-preview-card';

interface JoinGroupScreenProps {
  onBack: () => void;
  /** Called with the group's id once the person is in (or, when they already were, to open it). */
  onJoined: (groupId: string) => void;
}

/** How long typing must pause before the code is looked up. */
const LOOKUP_DELAY_MS = 400;

/** "Join a group": type a code, see whose group it is, choose whether to share check-ins, then join. */
export function JoinGroupScreen({ onBack, onJoined }: JoinGroupScreenProps) {
  const [code, setCode] = useState('');
  const [autoShare, setAutoShare] = useState(DEFAULT_AUTO_SHARE);
  const [error, setError] = useState<string | null>(null);
  const join = useJoinGroup();

  const typed = normalizeCode(code);
  const settled = useDebounced(typed, LOOKUP_DELAY_MS);
  const preview = useGroupPreview(settled);
  const lookedUp = typed.length >= MIN_CODE_LENGTH && settled === typed;
  const group = lookedUp ? preview.data : undefined;

  const status = lookupStatus();

  function lookupStatus(): { tone: 'found' | 'quiet' | 'error'; text: string } | null {
    if (typed.length < MIN_CODE_LENGTH) return null;
    if (!lookedUp || (preview.isFetching && !preview.data))
      return { tone: 'quiet', text: 'Checking…' };
    if (preview.isError) {
      const unknown = isApiError(preview.error) && preview.error.code === 'INVALID_INVITE_CODE';
      return {
        tone: 'error',
        text: unknown
          ? 'No group has this code.'
          : describeError(preview.error, 'Could not check the code.'),
      };
    }
    if (group) {
      return group.isMember
        ? { tone: 'quiet', text: "You're already in this group" }
        : { tone: 'found', text: 'Group found' };
    }
    return null;
  }

  const submit = async () => {
    if (!group || join.isPending) return;
    setError(null);
    if (group.isMember) {
      if (group.id) onJoined(group.id);
      return;
    }
    try {
      const joined = await join.mutateAsync({ inviteCode: typed, autoShare });
      onJoined(joined.id);
    } catch (e) {
      setError(describeError(e, 'Could not join the group. Please try again.'));
    }
  };

  const title = group ? `${group.isMember ? 'Open' : 'Join'} ${group.name}` : 'Join group';

  return (
    <Screen
      background="background"
      align="start"
      decoration={
        <View style={styles.flower}>
          <Svg width={210} height={210} viewBox="0 0 100 100">
            <Flower color={emotionColors.joy} />
          </Svg>
        </View>
      }
      footer={
        <Button
          title={title}
          onPress={submit}
          disabled={!group}
          loading={join.isPending}
          style={styles.cta}
        />
      }
    >
      <View style={styles.back}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      </View>
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        Join a group
      </AppText>
      <AppText color="textSecondary" style={styles.intro}>
        Enter the invite code a friend shared with you.
      </AppText>

      <View style={styles.field}>
        <AppText variant="label">Invite code</AppText>
        <CodeField
          value={code}
          onChangeText={(text) => {
            setCode(text);
            setError(null);
          }}
          onSubmitEditing={submit}
          editable={!join.isPending}
        />
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {status?.tone === 'found' ? <Icon name="check" size={14} color={colors.found} /> : null}
          {status ? (
            <AppText
              color={status.tone === 'error' ? 'danger' : 'textSecondary'}
              style={[styles.statusText, status.tone === 'found' ? styles.found : null]}
            >
              {status.text}
            </AppText>
          ) : null}
        </View>
      </View>

      {group ? (
        <View style={styles.wide}>
          <GroupPreviewCard group={group} />
        </View>
      ) : null}

      {group && !group.isMember ? (
        <View style={[styles.wide, styles.shareRow]}>
          <View style={styles.shareText}>
            <AppText style={styles.shareTitle}>Share my check-ins here</AppText>
            <AppText style={styles.shareHint}>
              {autoShare ? 'Each daily mood posts automatically' : 'You choose what to post'}
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Share my check-ins with this group"
            value={autoShare}
            onValueChange={setAutoShare}
            trackColor={{ false: colors.dashed, true: colors.brand }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.dashed}
          />
        </View>
      ) : null}

      {error ? (
        <AppText color="danger" accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flower: { position: 'absolute', top: -50, right: -60 },
  back: { alignItems: 'flex-start' },
  title: { marginTop: 22 },
  intro: { marginTop: 8 },
  field: { marginTop: 22, gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20 },
  statusText: { fontSize: 13, lineHeight: 18 },
  found: { color: colors.found },
  // The cards sit 16 from the screen edge in the design, 8 wider than the text above them.
  wide: { marginTop: 18, marginHorizontal: -8 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  shareText: { flex: 1, gap: 2 },
  shareTitle: { fontFamily: fontFamily.body.medium },
  shareHint: { fontSize: 13, lineHeight: 18, color: colors.sandText },
  error: { marginTop: 16 },
  cta: { minHeight: 58 },
});
