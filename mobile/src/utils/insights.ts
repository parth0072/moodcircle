import { EMOTIONS, emotionLabels, type Emotion } from '@/constants/emotions';

/** The entry fields insights need. */
export interface InsightEntry {
  emotion: Emotion;
  date: string;
  createdAt: string;
}

/** One calendar day and how it went: the emotion of its latest entry, or null if nothing was logged. */
export interface DayMood {
  date: string;
  emotion: Emotion | null;
}

export interface RankedEmotion {
  emotion: Emotion;
  days: number;
}

export type InsightRange = 'week' | 'month';

/** Days shown for each range: the last 7, or the last 30. */
export const RANGE_DAYS: Record<InsightRange, number> = { week: 7, month: 30 };

/** A day is summed up by its latest entry: several check-ins in a day are one mood, the last one. */
export function moodByDay(entries: InsightEntry[], days: string[]): DayMood[] {
  const latest = new Map<string, InsightEntry>();
  for (const entry of entries) {
    const seen = latest.get(entry.date);
    if (!seen || entry.createdAt > seen.createdAt) latest.set(entry.date, entry);
  }
  return days.map((date) => ({ date, emotion: latest.get(date)?.emotion ?? null }));
}

export function checkedInDays(days: DayMood[]): number {
  return days.filter((d) => d.emotion !== null).length;
}

/** Emotions by the number of days they were the day's mood, most first (ties keep the design's order). */
export function rankEmotions(days: DayMood[]): RankedEmotion[] {
  const counts = new Map<Emotion, number>();
  for (const { emotion } of days) if (emotion) counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
  return EMOTIONS.filter((e) => counts.has(e))
    .map((emotion) => ({ emotion, days: counts.get(emotion) ?? 0 }))
    .sort((a, b) => b.days - a.days);
}

/** How pleasant each emotion is, from -2 (anger) to +2 (joy): only used to measure day-to-day swings. */
export const VALENCE: Record<Emotion, number> = {
  joy: 2,
  calm: 1,
  meh: 0,
  worry: -1,
  sad: -1,
  anger: -2,
};

/**
 * The balance score, 0 to 100: how steady the days were. It is 100 minus the average change in
 * mood between one checked-in day and the next, where the biggest possible swing (joy to anger, 4
 * steps) costs 100 points, so a calm-to-joy week scores far higher than a joy-to-anger one. Days
 * with no entry are skipped. It needs two checked-in days; before that it is null.
 */
export function balanceScore(days: DayMood[]): number | null {
  const moods = days.flatMap((d) => (d.emotion ? [VALENCE[d.emotion]] : []));
  if (moods.length < 2) return null;
  let swing = 0;
  for (let i = 1; i < moods.length; i++) swing += Math.abs(moods[i] - moods[i - 1]);
  const average = swing / (moods.length - 1);
  return Math.max(0, Math.min(100, Math.round(100 - average * 25)));
}

/** The line under the balance score: how it compares with the period before. */
export function balanceTrend(
  current: number | null,
  previous: number | null,
  range: InsightRange,
): string {
  if (current === null) return 'Check in on a few more days to see it';
  if (previous === null) return `Your first ${range} of data`;
  const diff = current - previous;
  if (diff >= 3) return `Steadier than last ${range}`;
  if (diff <= -3) return `Less steady than last ${range}`;
  return `About as steady as last ${range}`;
}

/** The sentence under "Your moods". */
export function summarySentence(
  range: InsightRange,
  checkedIn: number,
  ranked: RankedEmotion[],
): string {
  const total = RANGE_DAYS[range];
  if (checkedIn === 0) {
    return range === 'week'
      ? 'No check-ins yet this week. Log how you feel to see your moods here.'
      : 'No check-ins in the last 30 days. Log how you feel to see your moods here.';
  }
  const [first, second] = ranked;
  if (range === 'week') {
    return `You checked in ${checkedIn} of ${total} days this week. ${emotionLabels[first.emotion]} showed up most.`;
  }
  const days = checkedIn === 1 ? '1 day' : `${checkedIn} days`;
  const leaders = second
    ? `${emotionLabels[first.emotion]} and ${emotionLabels[second.emotion]} led the way.`
    : `${emotionLabels[first.emotion]} led the way.`;
  return `You checked in ${days} this month. ${leaders}`;
}
