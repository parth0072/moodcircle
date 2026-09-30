import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Blob } from '@/components/blob';
import { Button } from '@/components/button';
import { CheckMark } from '@/components/check-mark';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { TextField } from '@/components/text-field';
import { usePasswordLogin, useRequestOtp } from '@/hooks/use-auth';
import { emotionColors } from '@/theme';
import { describeError } from '@/utils/error-message';

interface LogInScreenProps {
  onBack: () => void;
  onSignUp: () => void;
  /** "Forgot password?": the code has been emailed; the route opens the code screen. */
  onForgotCodeSent: (email: string) => void;
}

interface Errors {
  email?: string;
  password?: string;
  form?: string;
}

/** Log in with email and password. "Forgot password?" signs in with an emailed code instead. */
export function LogInScreen({ onBack, onSignUp, onForgotCodeSent }: LogInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const login = usePasswordLogin();
  const requestOtp = useRequestOtp();
  const pending = login.isPending || requestOtp.isPending;

  // A message goes away as soon as its field is edited: it described the old text.
  const edit = (field: keyof Errors, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  };

  const address = email.trim().toLowerCase();
  const emailValid = /^\S+@\S+$/.test(address);

  const submit = async () => {
    if (pending) return;
    const found: Errors = {};
    if (!emailValid) found.email = 'Enter a valid email address';
    if (!password) found.password = 'Enter your password';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      // Success flips the session; the auth gate then leaves this screen by itself.
      await login.mutateAsync({ email: address, password, remember });
    } catch (e) {
      // A wrong password keeps both fields as typed, so fixing one character is one tap away.
      setErrors({ form: describeError(e) });
    }
  };

  const forgot = async () => {
    if (pending) return;
    if (!emailValid)
      return setErrors({ email: 'Enter your email first, then tap Forgot password' });
    setErrors({});
    try {
      await requestOtp.mutateAsync(address);
      onForgotCodeSent(address);
    } catch (e) {
      setErrors({ form: describeError(e) });
    }
  };

  return (
    <Screen
      background="background"
      align="start"
      decoration={
        <View style={styles.blob}>
          <Blob shape="calm" color={emotionColors.anger} width={190} height={190} />
        </View>
      }
    >
      <View style={styles.back}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      </View>

      <AppText variant="headline" accessibilityRole="header">
        Welcome back
      </AppText>
      <AppText color="textSecondary" style={styles.sub}>
        Log in to keep your streak going.
      </AppText>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={edit('email', setEmail)}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          error={errors.email}
          editable={!pending}
        />
        <TextField
          label="Password"
          secure
          value={password}
          onChangeText={edit('password', setPassword)}
          placeholder="Your password"
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
          editable={!pending}
        />
        <View style={styles.options}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Remember me"
            accessibilityState={{ checked: remember }}
            onPress={() => setRemember((r) => !r)}
            style={styles.remember}
          >
            <CheckMark checked={remember} />
            <AppText variant="bodySm" color="textSoft">
              Remember me
            </AppText>
          </Pressable>
          <TextButton title="Forgot password?" size="large" onPress={forgot} disabled={pending} />
        </View>
      </View>

      {errors.form ? (
        <AppText variant="label" color="danger" accessibilityRole="alert" style={styles.formError}>
          {errors.form}
        </AppText>
      ) : null}

      <View style={styles.action}>
        <Button title="Log in" onPress={submit} loading={login.isPending} />
      </View>

      <View style={styles.spacer} />

      <View style={styles.signup}>
        <AppText variant="input" color="textSoft">
          {'New to Moodbloom? '}
        </AppText>
        <TextButton title="Create an account" size="large" onPress={onSignUp} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', top: -60, right: -40 },
  back: { alignItems: 'flex-start', marginBottom: 28 },
  sub: { marginTop: 8 },
  form: { gap: 16, marginTop: 28 },
  options: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formError: { marginTop: 12 },
  action: { marginTop: 24 },
  spacer: { flex: 1, minHeight: 32 },
  signup: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
