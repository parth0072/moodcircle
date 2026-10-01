import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radius } from '@/theme';

interface PromptChipProps {
  label: string;
  onPress: () => void;
}

/** A writing prompt under the text ("What happened?"): a small dashed pill; a tap starts a line with it. */
export function PromptChip({ label, onPress }: PromptChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]}
    >
      <AppText variant="bodySm" color="textSoft" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.promptBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, lineHeight: 18 },
});
