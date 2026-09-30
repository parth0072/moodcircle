import type { TextStyle } from 'react-native';

// Names match the exports of @expo-google-fonts/fraunces and @expo-google-fonts/dm-sans, which
// are registered in the root layout with useFonts. Each weight is its own font file, so set
// fontFamily and never fontWeight (iOS would synthesise the weight or fall back to system).
// The web CSS uses weights 500/600/700 (and 800 five times): 800 maps to bold.
export const fontFamily = {
  display: {
    regular: 'Fraunces_400Regular',
    medium: 'Fraunces_500Medium',
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
  },
  body: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
} as const;

// Fraunces carries headlines, scores and mood labels; DM Sans everything else. Sizes are the
// ones the web CSS uses most (10, 12, 13, 14, 15) plus its heading steps (16, 24, 26, 30).
export const type = {
  displayLg: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displayTitle: { fontFamily: fontFamily.display.semibold, fontSize: 27, lineHeight: 32 },
  displayMd: { fontFamily: fontFamily.display.semibold, fontSize: 24, lineHeight: 30 },
  displaySm: { fontFamily: fontFamily.display.semibold, fontSize: 16, lineHeight: 22 },
  displayHero: {
    fontFamily: fontFamily.display.bold,
    fontSize: 60,
    lineHeight: 60,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  stat: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  quote: { fontFamily: fontFamily.display.semibold, fontSize: 17, lineHeight: 24 },
  moodLabel: { fontFamily: fontFamily.display.semibold, fontSize: 13, lineHeight: 18 },
  score: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 26,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  heading: { fontFamily: fontFamily.body.bold, fontSize: 22, lineHeight: 28 },
  title: { fontFamily: fontFamily.body.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.body.regular, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fontFamily.body.regular, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fontFamily.body.semibold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.body.medium, fontSize: 13, lineHeight: 18 },
  link: { fontFamily: fontFamily.body.semibold, fontSize: 13, lineHeight: 18 },
  linkLg: { fontFamily: fontFamily.body.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fontFamily.body.medium, fontSize: 10, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof type;
