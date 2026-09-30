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

// Fraunces carries headlines, numbers and emotion names; DM Sans everything else. Sizes come from
// the Moodbloom design canvas.
export const type = {
  wordmark: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  display: {
    fontFamily: fontFamily.display.bold,
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -0.6,
  },
  headlineLg: {
    fontFamily: fontFamily.display.bold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: fontFamily.display.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  titleLg: { fontFamily: fontFamily.display.semibold, fontSize: 22, lineHeight: 28 },
  titleMd: { fontFamily: fontFamily.display.semibold, fontSize: 19, lineHeight: 24 },
  pill: { fontFamily: fontFamily.display.medium, fontSize: 17, lineHeight: 22 },
  button: { fontFamily: fontFamily.body.medium, fontSize: 17, lineHeight: 22 },
  buttonBold: { fontFamily: fontFamily.body.bold, fontSize: 17, lineHeight: 22 },
  input: { fontFamily: fontFamily.body.regular, fontSize: 16, lineHeight: 22 },
  linkBold: { fontFamily: fontFamily.body.bold, fontSize: 15, lineHeight: 22 },
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
    fontFamily: fontFamily.display.bold,
    fontSize: 24,
    lineHeight: 30,
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
  label: { fontFamily: fontFamily.body.medium, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: fontFamily.body.semibold, fontSize: 13, lineHeight: 18 },
  linkLg: { fontFamily: fontFamily.body.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fontFamily.body.medium, fontSize: 10, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof type;
