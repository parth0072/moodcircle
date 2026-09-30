import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { emotionLabels } from '@/constants/emotions';
import { colors, emotionColors, fontFamily, radius } from '@/theme';
import type { DayMood } from '@/utils/insights';
import { weekdayInitial } from '@/utils/local-date';

/** The last seven days as dots: the emotion's colour, or a dashed ring for a day with no check-in. */
export function WeekDots({ days, today }: { days: DayMood[]; today: string }) {
  return (
    <View style={styles.row}>
      {days.map(({ date, emotion }) => {
        const isToday = date === today;
        return (
          <View
            key={date}
            style={styles.day}
            accessible
            accessibilityLabel={`${weekdayInitial(date)}${isToday ? ', today' : ''}: ${
              emotion ? emotionLabels[emotion] : 'no check-in'
            }`}
          >
            <AppText
              variant="caption"
              color={isToday ? 'text' : 'textSecondary'}
              style={isToday ? styles.todayInitial : null}
            >
              {weekdayInitial(date)}
            </AppText>
            <View style={[styles.ring, isToday ? styles.todayRing : null]}>
              <View
                style={[
                  styles.dot,
                  emotion ? { backgroundColor: emotionColors[emotion] } : styles.empty,
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  todayInitial: { fontFamily: fontFamily.body.bold },
  // The ring is drawn around today's dot with a cream gap, like the design's double outline.
  ring: { padding: 3, borderRadius: radius.full, borderWidth: 2, borderColor: 'transparent' },
  todayRing: { borderColor: colors.ink },
  dot: { width: 28, height: 28, borderRadius: radius.full },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed },
});
