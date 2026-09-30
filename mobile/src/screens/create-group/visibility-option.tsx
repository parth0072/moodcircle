import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius } from '@/theme';

interface VisibilityOptionProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

/** One of the "Members can see" choices: a white row with a radio dot, ink outline when chosen. */
export function VisibilityOption({ title, description, selected, onPress }: VisibilityOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, { borderColor: selected ? colors.ink : colors.line }]}
    >
      <View style={styles.radio}>{selected ? <View style={styles.dot} /> : null}</View>
      <View style={styles.texts}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText color="textSecondary" style={styles.description}>
          {description}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.body.medium },
  description: { fontSize: 13, lineHeight: 18 },
});
