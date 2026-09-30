import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useSessionStore } from '@/stores/session-store';
import { describeError } from '@/utils/error-message';

interface ProfileSetupScreenProps {
  /** 'setup': an account without a name (the auth gate shows this). 'edit': changing the name later. */
  mode: 'setup' | 'edit';
  /** Called after 'edit' saves, so the route can close. In 'setup' the auth gate moves on by itself. */
  onSaved?: () => void;
  /** Shows a back button ('edit' is pushed on top of the profile). */
  onBack?: () => void;
}

/** The one thing every account needs: a name to show. Usually the sign-up form has already asked. */
export function ProfileSetupScreen({ mode, onSaved, onBack }: ProfileSetupScreenProps) {
  const [name, setName] = useState(() => useSessionStore.getState().user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile();

  const submit = async () => {
    if (update.isPending) return;
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter your name');
    setError(null);
    try {
      await update.mutateAsync({ name: trimmed });
      onSaved?.();
    } catch (e) {
      setError(describeError(e, 'Could not save your name'));
    }
  };

  return (
    <Screen background="background" align={mode === 'setup' ? 'center' : 'start'}>
      {onBack ? (
        <View style={styles.back}>
          <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        </View>
      ) : null}
      <View style={styles.header}>
        <AppText variant="headline" accessibilityRole="header">
          {mode === 'setup' ? 'What should we call you?' : 'Your name'}
        </AppText>
        <AppText color="textSecondary">
          {mode === 'setup'
            ? 'It is what you will see on your profile.'
            : 'Change how your name appears on your profile.'}
        </AppText>
      </View>
      <View style={styles.form}>
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={40}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error}
          editable={!update.isPending}
        />
        <Button
          title={mode === 'setup' ? 'Continue' : 'Save'}
          onPress={submit}
          loading={update.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'flex-start', marginBottom: 28 },
  header: { gap: 8, marginBottom: 28 },
  form: { gap: 20 },
});
