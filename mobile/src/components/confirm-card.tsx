import { StyleSheet, View } from 'react-native';

import { accents, colors, radius } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';

interface ConfirmCardProps {
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Delete this entry?" with its two buttons, drawn in the page. Used instead of a system alert,
 * which the web build (and its checks) cannot show.
 */
export function ConfirmCard({
  message,
  confirmLabel,
  cancelLabel = 'Keep it',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmCardProps) {
  return (
    <View accessibilityRole="alert" style={styles.card}>
      <AppText variant="bodyStrong">{message}</AppText>
      <View style={styles.buttons}>
        <Button
          title={cancelLabel}
          variant="outline"
          onPress={onCancel}
          disabled={loading}
          style={styles.button}
        />
        <Button
          title={confirmLabel}
          variant="danger"
          onPress={onConfirm}
          loading={loading}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: accents.danger,
    backgroundColor: colors.surface,
  },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 48 },
});
