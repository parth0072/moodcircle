import { istDate, istDateRange, istDaysAgo } from './ist-date';

describe('ist-date', () => {
  it('rolls to the next IST day at 18:30 UTC', () => {
    expect(istDate(new Date('2026-01-01T18:29:59Z'))).toBe('2026-01-01');
    expect(istDate(new Date('2026-01-01T18:30:00Z'))).toBe('2026-01-02');
  });

  it('counts back across a month boundary', () => {
    expect(istDaysAgo(1, new Date('2026-03-01T06:00:00Z'))).toBe('2026-02-28');
  });

  it('builds an oldest-first range that ends today', () => {
    const range = istDateRange(7, new Date('2026-03-03T06:00:00Z'));
    expect(range).toHaveLength(7);
    expect(range[0]).toBe('2026-02-25');
    expect(range[6]).toBe('2026-03-03');
  });
});
