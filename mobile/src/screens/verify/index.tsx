import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { OtpInput } from '@/components/otp-input';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { useRequestOtp, useVerifyOtp, type VerifyFlow } from '@/hooks/use-auth';
import { fontFamily } from '@/theme';
import { describeError } from '@/utils/error-message';

const CODE_LENGTH = 6;

interface VerifyScreenProps {
  email: string;
  /** 'signup' finishes creating the account; 'forgot' signs in and then offers a new password. */
  flow: VerifyFlow;
  onBack: () => void;
}

const INTRO: Record<VerifyFlow, string> = {
  signup: 'Enter the 6-digit code we sent to finish creating your account.',
  forgot: 'Enter the 6-digit code we sent to log in. You can then choose a new password.',
};

/** The six-digit code step. Success signs in; the auth gate then leaves this screen by itself. */
export function VerifyScreen({ email, flow, onBack }: VerifyScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const verify = useVerifyOtp(flow);
  const resend = useRequestOtp();

  const submit = async () => {
    if (verify.isPending) return;
    if (code.length < CODE_LENGTH) return setError(`Enter all ${CODE_LENGTH} digits`);
    setError(null);
    setNotice(null);
    try {
      await verify.mutateAsync({ email, otp: code });
    } catch (e) {
      setError(describeError(e));
    }
  };

  const sendAgain = async () => {
    setError(null);
    setNotice(null);
    try {
      await resend.mutateAsync(email);
      setCode('');
      setNotice('New code sent');
    } catch (e) {
      setError(describeError(e, 'Failed to resend'));
    }
  };

  return (
    <Screen background="background" align="start">
      <View style={styles.back}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
      </View>

      <AppText variant="headline" accessibilityRole="header">
        Check your email
      </AppText>
      <AppText color="textSecondary" style={styles.sub}>
        {INTRO[flow]}
      </AppText>
      <AppText color="textSecondary" style={styles.email} selectable>
        {`Sent to ${email}`}
      </AppText>

      <View style={styles.form}>
        <OtpInput
          value={code}
          onChange={setCode}
          length={CODE_LENGTH}
          autoFocus
          editable={!verify.isPending}
        />
        {error ? (
          <AppText variant="label" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? (
          <AppText variant="label" color="textSecondary" accessibilityRole="alert">
            {notice}
          </AppText>
        ) : null}
        <Button title="Verify" onPress={submit} loading={verify.isPending} />
        <View style={styles.resend}>
          <AppText variant="input" color="textSoft">
            {"Didn't get it? "}
          </AppText>
          <TextButton
            title="Resend"
            size="large"
            onPress={sendAgain}
            disabled={resend.isPending || verify.isPending}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'flex-start', marginBottom: 28 },
  sub: { marginTop: 8 },
  email: { marginTop: 4, fontFamily: fontFamily.body.medium },
  form: { gap: 20, marginTop: 28 },
  resend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
