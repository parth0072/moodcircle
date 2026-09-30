import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Flower } from '@/components/flower';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { TextField } from '@/components/text-field';
import { useRequestOtp } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { emotionColors } from '@/theme';
import { describeError } from '@/utils/error-message';
import { MIN_PASSWORD_LENGTH } from '@/utils/password-strength';

import { PasswordMeter } from './password-meter';
import { TermsCheckbox } from './terms-checkbox';

interface SignUpScreenProps {
  onBack: () => void;
  onLogIn: () => void;
  /** Called once the code has been emailed; the route opens the code screen. */
  onCodeSent: (email: string) => void;
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
  form?: string;
}

function Bloom() {
  return (
    <View style={styles.bloom}>
      <Svg width={200} height={200} viewBox="0 0 100 100">
        <Flower color={emotionColors.calm} />
      </Svg>
    </View>
  );
}

/**
 * Create an account: name, email and a password. The server confirms an email with a code before
 * it makes the account, so the next screen asks for that code, and only then are the name and
 * password saved (see useVerifyOtp). Until then they stay in memory.
 */
export function SignUpScreen({ onBack, onLogIn, onCodeSent }: SignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const requestOtp = useRequestOtp();

  // A message goes away as soon as its field is edited: it described the old text.
  const edit = (field: keyof Errors, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  };

  const submit = async () => {
    if (requestOtp.isPending) return;
    const address = email.trim().toLowerCase();
    const found: Errors = {};
    if (!name.trim()) found.name = 'Enter your name';
    if (!/^\S+@\S+$/.test(address)) found.email = 'Enter a valid email address';
    if (password.length < MIN_PASSWORD_LENGTH) {
      found.password = `Password needs at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (!agreed) found.terms = 'Agree to the Terms and Privacy Policy to continue';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await requestOtp.mutateAsync(address);
      useUiStore.getState().setSignupDraft({ name: name.trim(), password });
      onCodeSent(address);
    } catch (e) {
      // Everything typed stays: a network blip must not cost the user their form.
      setErrors({ form: describeError(e) });
    }
  };

  return (
    <Screen background="background" align="start" decoration={<Bloom />}>
      <View style={styles.back}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      </View>

      <AppText variant="headline" accessibilityRole="header">
        Create your account
      </AppText>
      <AppText color="textSecondary" style={styles.sub}>
        It takes less than a minute.
      </AppText>

      <View style={styles.form}>
        <TextField
          label="Your name"
          value={name}
          onChangeText={edit('name', setName)}
          placeholder="What should we call you?"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={40}
          returnKeyType="next"
          error={errors.name}
          editable={!requestOtp.isPending}
        />
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
          editable={!requestOtp.isPending}
        />
        <View style={styles.passwordBlock}>
          <TextField
            label="Password"
            secure
            value={password}
            onChangeText={edit('password', setPassword)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            error={errors.password}
            editable={!requestOtp.isPending}
          />
          <PasswordMeter password={password} />
        </View>
        <View style={styles.terms}>
          <TermsCheckbox
            checked={agreed}
            onChange={(next) => {
              setAgreed(next);
              if (next) setErrors((e) => ({ ...e, terms: undefined }));
            }}
          />
          {errors.terms ? (
            <AppText variant="caption" color="danger" accessibilityRole="alert">
              {errors.terms}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        {errors.form ? (
          <AppText variant="label" color="danger" accessibilityRole="alert" style={styles.center}>
            {errors.form}
          </AppText>
        ) : null}
        <Button title="Create account" onPress={submit} loading={requestOtp.isPending} />
        <View style={styles.login}>
          <AppText variant="input" color="textSoft">
            {'Already have an account? '}
          </AppText>
          <TextButton title="Log in" size="large" onPress={onLogIn} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bloom: { position: 'absolute', top: -40, right: -50 },
  back: { alignItems: 'flex-start', marginBottom: 28 },
  sub: { marginTop: 8 },
  form: { gap: 16, marginTop: 28 },
  passwordBlock: { gap: 8 },
  terms: { gap: 6 },
  spacer: { flex: 1, minHeight: 24 },
  actions: { gap: 16, paddingTop: 8 },
  center: { textAlign: 'center' },
  login: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
