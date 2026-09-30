import { EMOTIONS } from '../constants/emotions';
import { accents, colors, emotionColors, moodColors, type MoodLevel } from './colors';

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

describe('colour tokens', () => {
  it('keeps reading text at WCAG AA on both backgrounds', () => {
    for (const bg of [colors.background, colors.surface]) {
      expect(contrast(colors.text, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.textSecondary, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.textSoft, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.brand, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(accents.danger, bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('keeps text on the blue screens and on ink buttons at AA', () => {
    expect(contrast(colors.onBrand, colors.brand)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.onInk, colors.ink)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink, accents.sun)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink, accents.amber)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.brand, colors.brandTint)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps ink readable on the sand cards and on every emotion colour', () => {
    expect(contrast(colors.ink, colors.sand)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink, colors.track)).toBeGreaterThanOrEqual(AA);
    for (const emotion of EMOTIONS) {
      expect(contrast(colors.ink, emotionColors[emotion])).toBeGreaterThanOrEqual(AA);
    }
  });

  it('documents that the placeholder is a hint only', () => {
    expect(contrast(colors.placeholder, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.placeholder, colors.surface)).toBeLessThan(AA);
  });

  it('gives each emotion its own colour', () => {
    const values = EMOTIONS.map((e) => emotionColors[e]);
    expect(new Set(values).size).toBe(EMOTIONS.length);
  });
});

// Legacy 5-level mood colours, removed together with the screens that still use them.
describe('legacy mood colours', () => {
  it('keeps ink readable on every level', () => {
    for (const level of [1, 2, 3, 4, 5] as MoodLevel[]) {
      expect(contrast(colors.ink, moodColors[level].tint)).toBeGreaterThanOrEqual(AA);
    }
  });
});
