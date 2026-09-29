// Moodbloom palette, copied from the :root block of public/css/app.css. Light only for now:
// there is no dark variant, so app.json sets userInterfaceStyle to "light". When a dark palette
// exists, turn these into light/dark pairs behind one hook rather than adding a second file.
export const colors = {
  background: '#FAF6EE', // --bg
  surface: '#FFFFFF', // --white
  border: '#E9E1D0', // --border
  borderStrong: '#DDD0B4', // --border2
  brand: '#3651A8', // --p
  brandTint: '#E3E9F7', // --p-dim
  brandBorder: '#B7C4EC', // --p-border
  brandText: '#4A5A9C', // --p-text2
  ink: '#1E2A5A', // --p-dark, also the mood face stroke
  text: '#1E2A5A', // --txt
  textSecondary: '#5F6A8C', // --txt2
  // --txt3. Contrast is about 2.3:1 (fails WCAG AA): placeholders and decoration only,
  // never text the user has to read.
  textTertiary: '#9CA5C4',
  onBrand: '#FFFFFF',
} as const;

// Accents the web CSS still uses from before the Moodbloom redesign. They are real (streak card,
// "Send support" nudge, error toast), so they are tokens, but they sit outside the palette above:
// confirm or replace them with the designer before shipping. Avoid the web's other one-offs
// (stat numbers #22C55E and #F59E0B are about 2.2:1 on white): use brand, ink or a mood colour.
export const accents = {
  streak: {
    tint: '#FFF7ED',
    border: '#FED7AA',
    solid: '#EA580C', // big streak numbers only (3.4:1): 24px and up
    text: '#C2410C',
    textStrong: '#9A3412',
  },
  support: { tint: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  // The web uses #EF4444 (3.8:1 with white, or on white): fails AA for small text. #DC2626 is 4.8:1.
  danger: '#DC2626',
} as const;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const moodLabels = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
} as const satisfies Record<MoodLevel, string>;

// solid = --mN, tint = --mNb, text = --mNt. `text` on `tint` misses AA for levels 2 and 3
// (3.8:1 and 4.1:1): below 14px bold, label those chips with `colors.ink` instead.
export const moodColors = {
  1: { solid: '#D9848B', tint: '#FBEBEC', text: '#A24851' },
  2: { solid: '#F0A85E', tint: '#FCF1E0', text: '#B06B1E' },
  3: { solid: '#E3C765', tint: '#FAF6DE', text: '#8A752A' },
  4: { solid: '#8FB86A', tint: '#EEF5E6', text: '#4A6B2E' },
  5: { solid: '#6FB8A8', tint: '#E7F5F0', text: '#2A7A64' },
} as const satisfies Record<MoodLevel, { solid: string; tint: string; text: string }>;

/** Avatar backgrounds (AV_COLORS in public/js/constants.js). */
export const avatarColors = [
  '#5C6FA8',
  '#4A9B95',
  '#7A9E5C',
  '#C98A4A',
  '#B85C7A',
  '#5C8FB0',
  '#B0574A',
  '#8A6FB0',
] as const;
