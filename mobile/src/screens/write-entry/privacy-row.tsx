import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { TextButton } from '@/components/text-button';
import { colors, fontFamily, radius } from '@/theme';

interface PrivacyRowProps {
  /** Whether the person wants to choose friends once the entry is saved. */
  share: boolean;
  onChange: (share: boolean) => void;
  /** An entry that is already shared: who it is shared with, and a way to change that. */
  sharedLabel?: string;
  onChangeSharing?: () => void;
}

/** "Only me" or "Share with friends": the design's privacy switch card. */
export function PrivacyRow({ share, onChange, sharedLabel, onChangeSharing }: PrivacyRowProps) {
  if (sharedLabel) {
    return (
      <View style={styles.card}>
        <View style={styles.texts}>
          <AppText style={styles.title}>{sharedLabel}</AppText>
          <AppText variant="bodySm" color="textSecondary">
            You can change who sees it at any time
          </AppText>
        </View>
        <TextButton title="Change" size="medium" onPress={onChangeSharing} />
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.texts}>
        <AppText style={styles.title}>{share ? 'Share with friends' : 'Only me'}</AppText>
        <AppText variant="bodySm" color="textSecondary">
          {share ? 'Choose who sees it next' : 'Private, saved to your journal'}
        </AppText>
      </View>
      <Switch
        accessibilityLabel="Share with friends"
        value={share}
        onValueChange={onChange}
        trackColor={{ false: colors.dashed, true: colors.brand }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.dashed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.body.medium },
});
