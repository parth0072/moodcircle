import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/app-text';
import { TextButton } from '@/components/text-button';
import { colors, fontFamily } from '@/theme';
import { initialOf } from '@/utils/groups';
import { personColor } from '@/utils/people';

interface ReplyCardProps {
  /** Whose words these are: their id picks the avatar colour, the name is shown. */
  authorId: string;
  authorName: string;
  body: string;
  /** Offered when the person may delete it (their own reply, or any reply on their entry). */
  onDelete?: () => void;
}

/** One person's words under an entry: the design's white card with a round initial. */
export function ReplyCard({ authorId, authorName, body, onDelete }: ReplyCardProps) {
  return (
    <View style={styles.card}>
      <Avatar
        initial={initialOf(authorName)}
        color={personColor(authorId)}
        size={36}
        fontSize={15}
        font="serif"
      />
      <View style={styles.texts}>
        <AppText style={styles.name}>{authorName}</AppText>
        <AppText variant="bodySm" style={styles.body}>
          {body}
        </AppText>
        {onDelete ? (
          <TextButton title="Delete" size="small" onPress={onDelete} style={styles.delete} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.body.bold, fontSize: 14, lineHeight: 20 },
  body: { color: colors.bodyInk },
  delete: { alignSelf: 'flex-start', marginTop: 4 },
});
