import { Pressable, StyleSheet, View } from 'react-native';

import type { OverviewGroup } from '@/api/schemas/group';
import { AppText } from '@/components/app-text';
import { GroupTile } from '@/components/group-tile';
import { Icon } from '@/components/icon';
import { colors, fontFamily } from '@/theme';
import { pluralize } from '@/utils/groups';

interface GroupChoiceRowProps {
  group: OverviewGroup;
  checked: boolean;
  onToggle: () => void;
}

/** A group in the "Share with" list: its tile and size, and a checkbox. */
export function GroupChoiceRow({ group, checked, onToggle }: GroupChoiceRowProps) {
  const size = pluralize(group.memberCount, 'member');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${group.name}, ${size}`}
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.row}
    >
      <GroupTile name={group.name} color={group.color} size={36} cornerRadius={12} fontSize={16} />
      <View style={styles.texts}>
        <AppText style={styles.name}>{group.name}</AppText>
        <AppText color="textSecondary" variant="caption">
          {size}
        </AppText>
      </View>
      <View style={[styles.box, checked ? styles.boxOn : null]}>
        {checked ? <Icon name="check" size={14} color={colors.onInk} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1 },
  name: { fontFamily: fontFamily.body.medium },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ink },
});
