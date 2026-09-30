import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, emotionColors } from '@/theme';
import { passwordStrength } from '@/utils/password-strength';

/** Four bars and a line under the password field, guiding towards a stronger password. */
export function PasswordMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <View style={styles.meter} accessible accessibilityLabel={`Password strength: ${label}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.bar,
              { backgroundColor: bar <= score ? emotionColors.meh : colors.meterOff },
            ]}
          />
        ))}
      </View>
      <AppText variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: 8 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 13, lineHeight: 18 },
});
