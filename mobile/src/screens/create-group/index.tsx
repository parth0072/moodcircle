import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Group } from '@/api/schemas/group';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { GROUP_NAME_MAX, VISIBILITY_OPTIONS, type GroupColor } from '@/constants/groups';
import { useCreateGroup } from '@/hooks/use-groups';
import { colors } from '@/theme';
import { describeError } from '@/utils/error-message';
import { shareInvite } from '@/utils/share-invite';

import { ColorSwatches } from './color-swatches';
import { VisibilityOption } from './visibility-option';

interface CreateGroupScreenProps {
  onBack: () => void;
  /** Called once the group exists and the invitation has been offered for sharing. */
  onCreated: (group: Group) => void;
}

/** "Start a group": a name, a colour, what members can see; then it is created and the invite shared. */
export function CreateGroupScreen({ onBack, onCreated }: CreateGroupScreenProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<GroupColor>('blue');
  const [showNotes, setShowNotes] = useState<boolean>(VISIBILITY_OPTIONS[0].showNotes);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateGroup();

  const submit = async () => {
    if (create.isPending) return;
    const trimmed = name.trim();
    if (!trimmed) return setError('Give your group a name');
    setError(null);
    try {
      const group = await create.mutateAsync({ name: trimmed, color, showNotes });
      // "Create & share invite": the share sheet opens right away, then the group's feed.
      await shareInvite(group.name, group.inviteCode);
      onCreated(group);
    } catch (e) {
      setError(describeError(e, 'Could not create the group. Please try again.'));
    }
  };

  return (
    <Screen
      background="background"
      align="start"
      footer={
        <Button
          title="Create & share invite"
          onPress={submit}
          loading={create.isPending}
          style={styles.cta}
        />
      }
    >
      <View style={styles.back}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      </View>
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        Start a group
      </AppText>

      <View style={styles.form}>
        <TextField
          label="Group name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          placeholder="Sunday Circle"
          autoCapitalize="words"
          maxLength={GROUP_NAME_MAX}
          returnKeyType="done"
          editable={!create.isPending}
          error={error}
        />

        <View style={styles.group}>
          <AppText variant="label">Group colour</AppText>
          <ColorSwatches value={color} onChange={setColor} />
        </View>

        <View style={styles.group}>
          <AppText variant="label">Members can see</AppText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Members can see"
            style={styles.options}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <VisibilityOption
                key={option.title}
                title={option.title}
                description={option.description}
                selected={option.showNotes === showNotes}
                onPress={() => setShowNotes(option.showNotes)}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.code}>
        <AppText style={styles.codeLabel}>Invite code</AppText>
        <AppText style={styles.codeText}>Made when you create the group</AppText>
      </View>
      <AppText color="textSecondary" style={styles.note}>
        Anyone with the code can join. You can share it again from the group.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'flex-start' },
  title: { marginTop: 22 },
  form: { marginTop: 22, gap: 18 },
  group: { gap: 8 },
  options: { gap: 8 },
  code: {
    marginTop: 22,
    gap: 2,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  codeLabel: { fontSize: 13, lineHeight: 18, color: colors.sandText },
  codeText: { fontSize: 15, lineHeight: 22, color: colors.sandText },
  note: { marginTop: 14, fontSize: 13, lineHeight: 18 },
  cta: { minHeight: 58 },
});
