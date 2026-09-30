import { StyleSheet, View } from 'react-native';

import type { GroupPreview } from '@/api/schemas/group';
import { AppText } from '@/components/app-text';
import { GroupTile } from '@/components/group-tile';
import { colors, fontFamily, radius } from '@/theme';
import { pluralize } from '@/utils/groups';

/** The "Group found" card: whose group it is and what members see of each other. */
export function GroupPreviewCard({ group }: { group: GroupPreview }) {
  const blurb = group.showNotes
    ? "Members see each other's mood and notes. Posts stay inside the group."
    : "Members see each other's mood, not their notes. Posts stay inside the group.";
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <GroupTile
          name={group.name}
          color={group.color}
          size={52}
          cornerRadius={16}
          fontSize={22}
        />
        <View style={styles.titles}>
          <AppText numberOfLines={1} style={styles.name}>
            {group.name}
          </AppText>
          <AppText color="textSecondary" style={styles.meta}>
            {`Created by ${group.createdByName ?? 'a member'} · ${pluralize(group.memberCount, 'member')}`}
          </AppText>
        </View>
      </View>
      <AppText color="textSoft">{blurb}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.display.semibold, fontSize: 20, lineHeight: 26 },
  meta: { fontSize: 13, lineHeight: 18 },
});
