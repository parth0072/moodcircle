import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useSetPassword } from '@/hooks/use-auth';
import { describeError } from '@/utils/error-message';

const MIN_LENGTH = 6;

interface SetPasswordScreenProps {
  /** True when the account has no password yet: the sheet is an offer that can be skipped. */
  firstTime: boolean;
  onDone: () => void;
}

/** Quick-login password sheet (web `#pw-sheet`): set a password so the next sign-in needs no code. */
export function SetPasswordScreen({ firstTime, onDone }: SetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setPasswordMutation = useSetPassword();

  const submit = async () => {
    if (setPasswordMutation.isPending) return;
    if (password.length < MIN_LENGTH)
      return setError(`Password must be at least ${MIN_LENGTH} characters`);
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
    <Screen align="start" background="surface" top={24}>
      <View style={styles.header}>
        <AppText variant="heading">
          {firstTime ? 'Set a quick-login password' : 'Change password'}
        </AppText>
        <AppText variant="label" color="textSecondary">
          {firstTime
            ? 'Next time you can sign in instantly — no OTP needed.'
            : 'Update your password for quick login.'}
        </AppText>
      </View>
      <View style={styles.form}>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat password"
          secureTextEntry
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
        <Button title="Set Password" onPress={submit} loading={setPasswordMutation.isPending} />
        {firstTime ? <Button title="Skip for now" variant="outline" onPress={onDone} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 16 },
  form: { gap: 12 },
});
