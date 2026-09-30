import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { Icon } from './icon';

/**
 * The 20 pt box of a checkbox row: ink outline, filled with ink and a tick when checked. Put it
 * inside a Pressable that has `accessibilityRole="checkbox"`; the box itself is decorative.
 */
export function CheckMark({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.box, checked ? styles.checked : null]}>
      {checked ? <Icon name="check" size={14} color={colors.onInk} strokeWidth={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.ink },
});
