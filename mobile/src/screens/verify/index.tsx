import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { OtpInput } from '@/components/otp-input';
import { Screen } from '@/components/screen';
import { TextButton } from '@/components/text-button';
import { useRequestOtp, useVerifyOtp } from '@/hooks/use-auth';
import { fontFamily } from '@/theme';
import { describeError } from '@/utils/error-message';

const CODE_LENGTH = 6;

interface VerifyScreenProps {
  email: string;
  onBack: () => void;
}

/** The six-digit code step. Success signs in; the auth gate then leaves this screen by itself. */
export function VerifyScreen({ email, onBack }: VerifyScreenProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const verify = useVerifyOtp();
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
    <View style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <AppText variant="displayMd">Enter OTP</AppText>
          <AppText variant="bodySm" color="textSecondary" style={styles.sub}>
            {'Sent to '}
            <AppText variant="bodySm" style={styles.email} selectable>
              {email}
            </AppText>
          </AppText>
        </View>

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
            <AppText variant="bodySm" color="textSecondary">
              {"Didn't get it? "}
            </AppText>
            <TextButton
              title="Resend"
              size="medium"
              onPress={sendAgain}
              disabled={resend.isPending || verify.isPending}
            />
          </View>
        </View>
      </Screen>
      <IconButton
        icon="chevron-left"
        label="Back"
        onPress={onBack}
        style={[styles.back, { top: insets.top + 12 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: 24 },
  sub: { marginTop: 6 },
  email: { fontFamily: fontFamily.body.semibold },
  form: { gap: 20 },
  resend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: -6 },
  back: { position: 'absolute', left: 20 },
});
