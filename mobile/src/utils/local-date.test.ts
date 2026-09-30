import {
  addDays,
  formatTime,
  greeting,
  lastDays,
  localDate,
  sinceLabel,
  weekdayInitial,
} from './local-date';

describe('local dates', () => {
  it('writes the device-local day, not the UTC one', () => {
    expect(localDate(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
    expect(localDate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('lists the last n days oldest first, ending today', () => {
    expect(lastDays('2026-09-30', 3)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    expect(lastDays('2026-03-02', 7)).toHaveLength(7);
    expect(lastDays('2026-03-02', 7)[0]).toBe('2026-02-24');
  });

  it('gives the weekday initial of a day', () => {
    expect(weekdayInitial('2026-09-28')).toBe('M'); // a Monday
    expect(weekdayInitial('2026-09-30')).toBe('W');
    expect(weekdayInitial('2026-10-04')).toBe('S'); // a Sunday
  });

  it('greets by the hour', () => {
    expect(greeting(new Date(2026, 8, 30, 8))).toBe('Good morning!');
    expect(greeting(new Date(2026, 8, 30, 13))).toBe('Good afternoon!');
    expect(greeting(new Date(2026, 8, 30, 20, 42))).toBe('Good evening!');
  });

  it('formats a time in lower case, like the design', () => {
    expect(formatTime(new Date(2026, 8, 30, 20, 42).toISOString())).toMatch(/^8:42\s?pm$/);
  });

  it('says since when the user has been checking in', () => {
    expect(sinceLabel(null, '2026-09-30')).toBe('Just getting started');
    expect(sinceLabel('2026-03-04', '2026-09-30')).toBe('Checking in since March');
    expect(sinceLabel('2025-11-20', '2026-09-30')).toBe('Checking in since November 2025');
  });
});
