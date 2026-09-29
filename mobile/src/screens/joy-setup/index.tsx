import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { TextField } from '@/components/text-field';
import { JOY_SUGGESTIONS, MAX_JOY_ACTIVITIES, MAX_JOY_LENGTH } from '@/constants/joy-suggestions';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useSessionStore } from '@/stores/session-store';
import { colors, radius } from '@/theme';
import { describeError } from '@/utils/error-message';

interface JoySetupScreenProps {
  onDone: () => void;
}

const isSuggestion = (activity: string) =>
  (JOY_SUGGESTIONS as readonly string[]).includes(activity);

/**
 * "What makes you feel good?" (web `#s-joy-setup`): the list shown back on a Rough or Low day.
 * Both buttons save the current choices, as the web does; saving at all (even an empty list)
 * marks the step done so it is not asked again.
 */
export function JoySetupScreen({ onDone }: JoySetupScreenProps) {
  const [chosen, setChosen] = useState<string[]>(
    () => useSessionStore.getState().user?.joyActivities ?? [],
  );
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile();
  const customChosen = chosen.filter((a) => !isSuggestion(a));

  const toggle = (activity: string) => {
    setError(null);
    if (chosen.includes(activity)) return setChosen(chosen.filter((a) => a !== activity));
    if (chosen.length >= MAX_JOY_ACTIVITIES)
      return setError(`You can add up to ${MAX_JOY_ACTIVITIES}`);
    setChosen([...chosen, activity]);
  };

  const addCustom = () => {
    const value = custom.trim();
    if (!value) return;
    if (chosen.length >= MAX_JOY_ACTIVITIES)
      return setError(`You can add up to ${MAX_JOY_ACTIVITIES}`);
    setError(null);
    if (!chosen.includes(value)) setChosen([...chosen, value]);
    setCustom('');
  };

  const save = async () => {
    if (update.isPending) return;
    setError(null);
    try {
      await update.mutateAsync({ joyActivities: chosen });
      onDone();
    } catch (e) {
      setError(describeError(e, 'Could not save'));
    }
  };

  return (
    <Screen align="start">
      <AppText variant="displayTitle">What makes you feel good?</AppText>
      <AppText color="textSecondary" style={styles.sub}>
        Pick a few things — on a hard day, we&apos;ll remind you of them.
      </AppText>

      <View style={styles.chips}>
        {JOY_SUGGESTIONS.map((activity) => (
          <Chip
            key={activity}
            label={activity}
            selected={chosen.includes(activity)}
            onPress={() => toggle(activity)}
          />
        ))}
      </View>

      {customChosen.length > 0 ? (
        <View style={styles.added}>
          {customChosen.map((activity) => (
            <View key={activity} style={styles.addedChip}>
              <AppText variant="link" color="brand">
                {activity}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${activity}`}
                hitSlop={8}
                onPress={() => toggle(activity)}
                style={styles.remove}
              >
                <AppText variant="caption" color="brand">
                  ✕
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.customRow}>
        <View style={styles.customInput}>
          <TextField
            label="Add your own"
            hideLabel
            value={custom}
            onChangeText={setCustom}
            placeholder="Add your own…"
            maxLength={MAX_JOY_LENGTH}
            returnKeyType="done"
            onSubmitEditing={addCustom}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          onPress={addCustom}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText variant="heading" color="brand">
            +
          </AppText>
        </Pressable>
      </View>

      {error ? (
        <AppText variant="label" color="danger" accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Button title="Continue" onPress={save} loading={update.isPending} />
      <View style={styles.skip}>
        <TextButton title="Skip for now" onPress={save} disabled={update.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6, marginBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  added: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  addedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radius.full,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  remove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 24 },
  customInput: { flex: 1 },
  addButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginBottom: 12 },
  skip: { alignItems: 'center', marginTop: 8 },
});
