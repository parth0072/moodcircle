import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AVATARS } from '@/constants/avatars';
import { colors, radius } from '@/theme';

const COLUMNS = 6;
const GAP = 8;
const SCREEN_PADDING = 24;

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

/** The big preview tile plus the six-column emoji grid (web `.ps-av-preview` and `.ps-av-grid`). */
export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <View>
      <View style={styles.preview} accessibilityLabel={`Chosen avatar ${value}`}>
        <AppText style={styles.previewEmoji}>{value}</AppText>
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {AVATARS.map((emoji) => {
          const selected = emoji === value;
          return (
            <Pressable
              key={emoji}
              accessibilityRole="radio"
              accessibilityLabel={`Avatar ${emoji}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(emoji)}
              style={[styles.option, { width: cell }, selected ? styles.optionSelected : null]}
            >
              <AppText style={styles.optionEmoji}>{emoji}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: 80,
    height: 80,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: colors.brandTint,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  previewEmoji: { fontSize: 42, lineHeight: 52 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: 24 },
  option: {
    height: 44,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  optionEmoji: { fontSize: 24, lineHeight: 30 },
});
