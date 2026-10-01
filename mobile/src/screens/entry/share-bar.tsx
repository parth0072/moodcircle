import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/app-text';
import { colors, radius } from '@/theme';
import { initialOf } from '@/utils/groups';
import { personColor } from '@/utils/people';

interface SharePerson {
  id: string;
  name: string | null;
}

interface ShareBarProps {
  /** The line beside the avatars: "Shared with Kabir", "Private", "From Kabir". */
  text: string;
  people: SharePerson[];
  /** The owner's "Share" button; left out for an entry that was shared with the person. */
  onShare?: () => void;
}

const MAX_AVATARS = 3;

/** The pinned sand-coloured bar at the bottom of an entry: who it is shared with, and the Share button. */
export function ShareBar({ text, people, onShare }: ShareBarProps) {
  return (
    <View style={styles.bar}>
      {people.length > 0 ? (
        <View style={styles.avatars}>
          {people.slice(0, MAX_AVATARS).map((person, index) => (
            <View key={person.id} style={index > 0 ? styles.overlap : null}>
              <Avatar
                initial={initialOf(person.name)}
                color={personColor(person.id)}
                size={30}
                fontSize={12}
                ringWidth={2}
                ringColor={colors.sand}
              />
            </View>
          ))}
        </View>
      ) : null}
      <AppText variant="bodySm" style={styles.text} numberOfLines={1}>
        {text}
      </AppText>
      {onShare ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={onShare}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
        >
          <AppText variant="label" color="onInk">
            Share
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -8 },
  text: { flex: 1, color: colors.sandText },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
