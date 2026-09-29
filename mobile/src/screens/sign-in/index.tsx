import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { TextField } from '@/components/text-field';
import { usePasswordLogin, useRequestOtp } from '@/hooks/use-auth';
import { describeError } from '@/utils/error-message';

import { SignInBlobs } from './blobs';
import { LogoMark } from './logo-mark';

interface SignInScreenProps {
  /** Called once the code has been emailed; the route pushes the code screen. */
  onCodeRequested: (email: string) => void;
}

type Mode = 'code' | 'password';

/** Email sign-in, with the web's toggle between a one-time code and a password on the same screen. */
export function SignInScreen({ onCodeRequested }: SignInScreenProps) {
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requestOtp = useRequestOtp();
  const passwordLogin = usePasswordLogin();
  const pending = requestOtp.isPending || passwordLogin.isPending;

  const toggleMode = () => {
    setMode((m) => (m === 'code' ? 'password' : 'code'));
    setError(null);
  };

  const submit = async () => {
    if (pending) return;
    const address = email.trim().toLowerCase();
    if (!address.includes('@')) return setError('Enter a valid email address');
    if (mode === 'password' && !password) return setError('Enter your password');
    setError(null);
    try {
      if (mode === 'password') {
        // Success flips the session; the auth gate then leaves this screen by itself.
        await passwordLogin.mutateAsync({ email: address, password });
      } else {
        await requestOtp.mutateAsync(address);
        onCodeRequested(address);
      }
    } catch (e) {
      // The fields keep what was typed: a wrong password must not wipe the email.
      setError(describeError(e));
    }
  };

  return (
    <Screen decoration={<SignInBlobs />}>
      <View style={styles.logo}>
        <LogoMark />
        <AppText variant="displayLg">MoodCircle</AppText>
        <AppText color="textSecondary">See how your circle is really feeling.</AppText>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType={mode === 'password' ? 'next' : 'go'}
          onSubmitEditing={mode === 'code' ? submit : undefined}
          editable={!pending}
        />
        {mode === 'password' ? (
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!pending}
          />
        ) : null}

        {error ? (
          <AppText variant="label" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        <Button
          title={mode === 'password' ? 'Sign In' : 'Continue'}
          onPress={submit}
          loading={pending}
        />

        <AppText variant="caption" color="textSecondary" style={styles.note}>
          {mode === 'password'
            ? 'Sign in with your password.'
            : "We'll email you a one-time code. No passwords."}
        </AppText>
        <View style={styles.toggle}>
          <TextButton
            title={mode === 'password' ? 'Use OTP instead' : 'Sign in with password instead'}
            onPress={toggleMode}
            disabled={pending}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { marginBottom: 40 },
  form: { gap: 14 },
  note: { textAlign: 'center' },
  toggle: { alignItems: 'center', marginTop: 4 },
});
