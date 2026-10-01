import { dayAndTime, dayLabel, entryMeta, longDay } from './journal-dates';

// Built from local parts, so the checks hold in any time zone.
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();
const now = new Date(2026, 8, 30, 9, 15); // Wed 30 Sep 2026, 9:15 am

describe('dayLabel', () => {
  it('says Today and Yesterday, then the date', () => {
    expect(dayLabel(at(2026, 9, 30, 0, 5), now)).toBe('Today');
    expect(dayLabel(at(2026, 9, 30, 23, 59), now)).toBe('Today');
    expect(dayLabel(at(2026, 9, 29, 23, 59), now)).toBe('Yesterday');
    expect(dayLabel(at(2026, 9, 27), now)).toBe('27 Sep');
    expect(dayLabel(at(2026, 1, 3), now)).toBe('3 Jan');
  });

  it('adds the year for an earlier year', () => {
    expect(dayLabel(at(2025, 12, 31), now)).toBe('31 Dec 2025');
  });

  it('counts calendar days, not 24-hour blocks', () => {
    const late = new Date(2026, 8, 30, 0, 10);
    expect(dayLabel(at(2026, 9, 29, 23, 50), late)).toBe('Yesterday');
  });
});

describe('dayAndTime', () => {
  it('adds the time in the device style, in lower case', () => {
    expect(dayAndTime(at(2026, 9, 29, 23, 20), now)).toMatch(/^Yesterday, 11:20 ?pm$/);
    expect(dayAndTime(at(2026, 9, 27, 8, 5), now)).toMatch(/^27 Sep, 8:05 ?am$/);
  });
});

describe('longDay', () => {
  it('names the weekday', () => {
    expect(longDay(at(2026, 9, 27), now)).toBe('Sun 27 Sep');
    expect(longDay(at(2025, 9, 27), now)).toBe('Sat 27 Sep 2025');
  });
});

describe('entryMeta', () => {
  it('gives a note its time', () => {
    expect(
      entryMeta({ type: 'note', createdAt: at(2026, 9, 29, 23, 20), photoCount: 0 }, now),
    ).toMatch(/^Note · Yesterday, 11:20 ?pm$/);
  });

  it('gives a memory its day and the number of photos', () => {
    expect(entryMeta({ type: 'memory', createdAt: at(2026, 9, 27), photoCount: 3 }, now)).toBe(
      'Memory · 27 Sep · 3 photos',
    );
    expect(entryMeta({ type: 'memory', createdAt: at(2026, 9, 20), photoCount: 1 }, now)).toBe(
      'Memory · 20 Sep · 1 photo',
    );
    expect(entryMeta({ type: 'memory', createdAt: at(2026, 9, 20), photoCount: 0 }, now)).toBe(
      'Memory · 20 Sep',
    );
  });

  it('counts the photos of a note too', () => {
    expect(
      entryMeta({ type: 'note', createdAt: at(2026, 9, 27, 10, 0), photoCount: 2 }, now),
    ).toMatch(/^Note · 27 Sep, 10:00 ?am · 2 photos$/);
  });
});
