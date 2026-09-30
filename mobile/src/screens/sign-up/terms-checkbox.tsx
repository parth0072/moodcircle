import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CheckMark } from '@/components/check-mark';
import { getPrivacyUrl, getTermsUrl } from '@/utils/env';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** "Terms" and "Privacy Policy" open the configured pages, or stay plain words when there are none. */
function LegalLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return <>{label}</>;
  return (
    <AppText
      variant="linkBold"
      color="brand"
      accessibilityRole="link"
      onPress={() => void Linking.openURL(url)}
      style={styles.link}
    >
      {label}
    </AppText>
  );
}

export function TermsCheckbox({ checked, onChange }: TermsCheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="I agree to the Terms and Privacy Policy"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={styles.mark}>
        <CheckMark checked={checked} />
      </View>
      <AppText variant="bodySm" color="textSoft" style={styles.text}>
        {'I agree to the '}
        <LegalLink label="Terms" url={getTermsUrl()} />
        {' and '}
        <LegalLink label="Privacy Policy" url={getPrivacyUrl()} />
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mark: { marginTop: 1 },
  text: { flex: 1 },
  link: { fontSize: 14, textDecorationLine: 'underline' },
});
