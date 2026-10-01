import { Pressable, StyleSheet, View } from 'react-native';

import type { SharePerson } from '@/api/schemas/journal';
import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { colors, fontFamily } from '@/theme';
import { initialOf } from '@/utils/groups';
import { groupsLabel, personColor, personName } from '@/utils/people';

interface PersonRowProps {
  person: SharePerson;
  checked: boolean;
  onToggle: () => void;
}

/** One person in the "Send to" list: their initial, name, where they are reached from, and a checkbox. */
export function PersonRow({ person, checked, onToggle }: PersonRowProps) {
  const name = personName(person);
  const via = groupsLabel(person.groups);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={via ? `${name}, ${via}` : name}
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.row}
    >
      <Avatar
        initial={initialOf(person.name ?? person.username)}
        color={personColor(person.id)}
        size={40}
        fontSize={16}
        font="serif"
      />
      <View style={styles.texts}>
        <AppText style={styles.name}>{name}</AppText>
        {via ? (
          <AppText variant="caption" color="textSecondary">
            {via}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.box, checked ? styles.boxOn : null]}>
        {checked ? <Icon name="check" size={14} color={colors.onInk} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
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
