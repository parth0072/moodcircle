import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useSetPassword } from '@/hooks/use-auth';
import { describeError } from '@/utils/error-message';
import { MIN_PASSWORD_LENGTH } from '@/utils/password-strength';

interface SetPasswordScreenProps {
  onDone: () => void;
}

/**
 * Choose a password, as a sheet after "Forgot password?" (or when saving the sign-up password
 * failed). The user is already signed in, so it can always be skipped.
 */
export function SetPasswordScreen({ onDone }: SetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setPasswordMutation = useSetPassword();

  const submit = async () => {
    if (setPasswordMutation.isPending) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password !== confirm) return setError('Passwords do not match');
    setError(null);
    try {
      await setPasswordMutation.mutateAsync(password);
      onDone();
    } catch (e) {
      setError(describeError(e, 'Failed to set password'));
    }
  };

  return (
    <Screen align="start" background="background" top={24}>
      <View style={styles.header}>
        <AppText variant="titleLg" accessibilityRole="header">
          Choose a password
        </AppText>
        <AppText variant="bodySm" color="textSecondary">
          Use it next time to log in without waiting for a code.
        </AppText>
      </View>
      <View style={styles.form}>
        <TextField
          label="New password"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label="Confirm password"
          secure
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat password"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? (
          <AppText variant="label" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <Button title="Save password" onPress={submit} loading={setPasswordMutation.isPending} />
        <Button title="Not now" variant="outline" onPress={onDone} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 16 },
  form: { gap: 12 },
});
