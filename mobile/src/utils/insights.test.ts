import type { Emotion } from '@/constants/emotions';

import {
  balanceScore,
  balanceTrend,
  checkedInDays,
  moodByDay,
  rankEmotions,
  summarySentence,
  type DayMood,
} from './insights';

const entry = (date: string, emotion: Emotion, time = '12:00') => ({
  date,
  emotion,
  createdAt: `${date}T${time}:00.000Z`,
});

const days = (...emotions: (Emotion | null)[]): DayMood[] =>
  emotions.map((emotion, i) => ({ date: `2026-09-${String(20 + i).padStart(2, '0')}`, emotion }));

describe('moodByDay', () => {
  const window = ['2026-09-28', '2026-09-29', '2026-09-30'];

  it('sums a day up by its latest entry', () => {
    const result = moodByDay(
      [
        entry('2026-09-30', 'joy', '08:00'),
        entry('2026-09-30', 'sad', '21:00'),
        entry('2026-09-28', 'calm'),
      ],
      window,
    );
    expect(result).toEqual([
      { date: '2026-09-28', emotion: 'calm' },
      { date: '2026-09-29', emotion: null },
      { date: '2026-09-30', emotion: 'sad' },
    ]);
  });

  it('ignores entries outside the window, and keeps the window order', () => {
    expect(moodByDay([entry('2026-08-01', 'joy')], window).every((d) => d.emotion === null)).toBe(
      true,
    );
    expect(moodByDay([], window).map((d) => d.date)).toEqual(window);
  });
});

describe('rankEmotions', () => {
  it('orders by days, most first, and leaves out emotions never felt', () => {
    const ranked = rankEmotions(days('calm', 'joy', 'calm', null, 'worry', 'calm', 'joy'));
    expect(ranked).toEqual([
      { emotion: 'calm', days: 3 },
      { emotion: 'joy', days: 2 },
      { emotion: 'worry', days: 1 },
    ]);
  });

  it('breaks ties in the design order (joy, calm, sad, worry, anger, meh)', () => {
    expect(rankEmotions(days('meh', 'anger', 'calm', 'joy')).map((r) => r.emotion)).toEqual([
      'joy',
      'calm',
      'anger',
      'meh',
    ]);
  });

  it('counts checked-in days', () => {
    expect(checkedInDays(days('calm', null, 'joy'))).toBe(2);
  });
});

describe('balanceScore', () => {
  it('needs two checked-in days', () => {
    expect(balanceScore(days())).toBeNull();
    expect(balanceScore(days('joy', null, null))).toBeNull();
  });

  it('is 100 when every day felt the same', () => {
    expect(balanceScore(days('calm', 'calm', 'calm'))).toBe(100);
  });

  it('drops with bigger swings: joy to anger is the worst case', () => {
    expect(balanceScore(days('joy', 'anger'))).toBe(0);
    expect(balanceScore(days('calm', 'joy'))).toBe(75);
    expect(balanceScore(days('calm', 'joy', 'calm', 'joy'))).toBe(75);
  });

  it('skips days without an entry instead of counting them as a swing', () => {
    expect(balanceScore(days('calm', null, null, 'calm'))).toBe(100);
  });

  it('stays between 0 and 100', () => {
    const score = balanceScore(days('joy', 'anger', 'joy', 'anger', 'joy'));
    expect(score).toBe(0);
  });
});

describe('balanceTrend', () => {
  it('compares with the period before', () => {
    expect(balanceTrend(80, 70, 'week')).toBe('Steadier than last week');
    expect(balanceTrend(60, 72, 'month')).toBe('Less steady than last month');
    expect(balanceTrend(72, 71, 'week')).toBe('About as steady as last week');
  });

  it('says so when there is nothing to compare', () => {
    expect(balanceTrend(72, null, 'week')).toBe('Your first week of data');
    expect(balanceTrend(null, 60, 'week')).toBe('Check in on a few more days to see it');
  });
});

describe('summarySentence', () => {
  const ranked = rankEmotions(days('calm', 'calm', 'calm', 'calm', 'joy', 'joy', 'joy'));

  it('matches the design copy for a week', () => {
    expect(summarySentence('week', 6, ranked)).toBe(
      'You checked in 6 of 7 days this week. Calm showed up most.',
    );
  });

  it('matches the design copy for a month, naming the top two', () => {
    expect(summarySentence('month', 24, ranked)).toBe(
      'You checked in 24 days this month. Calm and Joy led the way.',
    );
    expect(summarySentence('month', 1, ranked.slice(0, 1))).toBe(
      'You checked in 1 day this month. Calm led the way.',
    );
  });

  it('invites a first check-in when there is none', () => {
    expect(summarySentence('week', 0, [])).toMatch(/No check-ins yet this week/);
    expect(summarySentence('month', 0, [])).toMatch(/No check-ins in the last 30 days/);
  });
});
