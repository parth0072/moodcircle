import { accents, colors, moodColors, type MoodLevel } from './colors';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const levels: MoodLevel[] = [1, 2, 3, 4, 5];

describe('colour tokens', () => {
  it('keeps reading text at WCAG AA on both backgrounds', () => {
    for (const bg of [colors.background, colors.surface]) {
      expect(contrast(colors.text, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.textSecondary, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.brand, bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(colors.onBrand, colors.brand)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.brandText, colors.brandTint)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps the accent text pairs at AA', () => {
    expect(contrast(accents.streak.text, accents.streak.tint)).toBeGreaterThanOrEqual(AA);
    expect(contrast(accents.streak.textStrong, accents.streak.tint)).toBeGreaterThanOrEqual(AA);
    expect(contrast(accents.support.text, accents.support.tint)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.onBrand, accents.danger)).toBeGreaterThanOrEqual(AA);
    expect(contrast(accents.danger, colors.surface)).toBeGreaterThanOrEqual(AA);
  });

  it('streak solid is for large numbers only', () => {
    expect(contrast(accents.streak.solid, accents.streak.tint)).toBeGreaterThanOrEqual(3);
    expect(contrast(accents.streak.solid, accents.streak.tint)).toBeLessThan(AA);
  });

  it('documents that textTertiary is decoration only', () => {
    expect(contrast(colors.textTertiary, colors.background)).toBeLessThan(3);
  });

  it('keeps ink readable on every mood tint and solid', () => {
    for (const level of levels) {
      expect(contrast(colors.ink, moodColors[level].tint)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.ink, moodColors[level].solid)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('mood text on tint: AA except levels 2 and 3, which are large-text only', () => {
    for (const level of levels) {
      const ratio = contrast(moodColors[level].text, moodColors[level].tint);
      expect(ratio).toBeGreaterThanOrEqual(level === 2 || level === 3 ? 3 : AA);
    }
  });
});
