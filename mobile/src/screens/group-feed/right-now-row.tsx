import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { emotionLabels } from '@/constants/emotions';
import { colors, emotionColors, fontFamily } from '@/theme';
import type { RightNowMember } from '@/utils/groups';

/** "Right now": each member as a coloured circle with today's mood under it, or "Not yet". */
export function RightNowRow({ members }: { members: RightNowMember[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {members.map((member) => {
        const mood = member.emotion ? emotionLabels[member.emotion] : 'Not yet';
        return (
          <View
            key={member.id}
            accessible
            accessibilityLabel={`${member.name}, ${mood}`}
            style={styles.item}
          >
            <Avatar
              initial={member.initial}
              color={member.emotion ? emotionColors[member.emotion] : colors.notYetOnBlue}
              size={56}
              fontSize={20}
              font="serif"
              ringWidth={3}
              ringColor={member.emotion ? colors.background : 'rgba(255, 255, 255, 0.35)'}
            />
            <AppText color="onBrand" numberOfLines={1} style={styles.name}>
              {member.name}
            </AppText>
            <AppText color="onBrand" style={styles.mood}>
              {mood}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 14, paddingHorizontal: 16 },
  item: { width: 58, alignItems: 'center', gap: 6 },
  name: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.body.medium },
  mood: { fontSize: 12, lineHeight: 16, opacity: 0.8 },
});
