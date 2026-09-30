// Corner radii used by the Moodbloom design, plus the pill (999px there) for buttons and chips.
// Pair every non-pill radius with borderCurve: 'continuous' for the iOS squircle.
export const radius = {
  sm: 14, // "How strong?" blocks
  field: 16, // text inputs
  md: 20, // stat tiles
  card: 24, // settings card, "Try this" card
  lg: 26,
  sheet: 32, // the cream sheet under the Home hero
  full: 9999,
} as const;
