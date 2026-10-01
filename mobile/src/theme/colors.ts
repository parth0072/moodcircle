import type { Emotion } from '../constants/emotions';
import type { GroupColor } from '../constants/groups';

// Moodbloom palette, taken from the "Moodbloom – Mood Tracking App" design canvas. Light only for
// now: there is no dark variant, so app.json sets userInterfaceStyle to "light". When a dark
// palette exists, turn these into light/dark pairs behind one hook rather than adding a second file.
export const colors = {
  // Surfaces
  background: '#FAF6EE', // cream screens
  surface: '#FFFFFF', // inputs, cards
  sand: '#EFE3CC', // unfilled strength blocks, the "Try this" card
  track: '#EFE8D8', // the Week/Month control's track
  // Brand and ink
  brand: '#3651A8', // blue screens, links, switches
  brandTint: '#EEF1FA', // icon tiles in settings rows
  ink: '#1E2A5A', // headings, body text, primary buttons
  text: '#1E2A5A',
  textSecondary: '#5B6180', // helper lines, labels of small numbers
  textSoft: '#4A5074', // "Already have an account?"
  // Placeholder text. 3.9:1 on white: enough for a hint, never for text the user must read.
  placeholder: '#7A7F98',
  onBrand: '#FFFFFF', // text on the blue screens
  onInk: '#FAF6EE', // text on ink-coloured buttons
  // Lines
  line: '#E6D3A8', // input, round-button and card borders
  lineSoft: '#F1EADB', // dividers inside a card
  chipBorder: '#D8CBAA',
  dashed: '#C9C2AE', // "no entry" day
  switchOff: '#D6D2C6',
  meterOff: '#E6DFCC', // empty bar of the password meter
  // Groups
  coral: '#F37A6B', // the unread badge on a group
  found: '#3F6B24', // "Group found"
  sandText: '#6B5B3A', // helper lines on the sand-coloured cards
  notYet: '#EFE8D8', // a member who has not checked in yet (same as track)
  notYetOnBlue: '#5E73BE', // the same, on the blue group screen
  // Journal
  promptBorder: '#C9B98F', // the dashed "What happened?" chips and the "Add photo" tile
  skyTint: '#E3F1FB', // the "Heavy day?" banner
  bodyInk: '#34405F', // the words of a memory and of a reply
  scrim: 'rgba(250, 246, 238, 0.9)', // round buttons over a photo
  // Legacy names still used by screens that are being replaced; removed together with them.
  border: '#E9E1D0',
  borderStrong: '#DDD0B4',
  brandBorder: '#B7C4EC',
  brandText: '#4A5A9C',
  textTertiary: '#9CA5C4',
} as const;

// One colour per emotion: the face, its blob on the insights screen and its dot in the week row.
// Ink text reads on every one of them (colors.test.ts).
export const emotionColors: Record<Emotion, string> = {
  joy: '#F6C6D6',
  calm: '#A9DCC8',
  sad: '#8FCBF0',
  worry: '#C9E6DA',
  anger: '#F9C77E',
  meh: '#A7C47A',
};

// The colour a group takes (its tile, and the swatches on the create screen), and the letter's colour
// on it: white on the blue one, ink on the light ones.
export const groupColors: Record<GroupColor, string> = {
  blue: '#3651A8',
  sage: '#A7C47A',
  pink: '#F6C6D6',
  peach: '#F9C77E',
  mint: '#A9DCC8',
};

export const groupOnColor: Record<GroupColor, string> = {
  blue: '#FFFFFF',
  sage: '#1E2A5A',
  pink: '#1E2A5A',
  peach: '#1E2A5A',
  mint: '#1E2A5A',
};

export const accents = {
  sun: '#F9C77E', // the welcome screen's call to action
  amber: '#F7B04A', // the balance score card
  strength: '#E0668F', // filled "How strong?" blocks, blush on the joy face
  // Errors and "Log out". The design's own red: 5.6:1 on cream, 6.0:1 on white.
  danger: '#B03A2E',
  // Old streak and support colours, kept until the screens that use them are gone.
  streak: {
    tint: '#FFF7ED',
    border: '#FED7AA',
    solid: '#EA580C',
    text: '#C2410C',
    textStrong: '#9A3412',
  },
  support: { tint: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
} as const;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const moodLabels = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
} as const satisfies Record<MoodLevel, string>;

export const moodColors = {
  1: { solid: '#D9848B', tint: '#FBEBEC', text: '#A24851' },
  2: { solid: '#F0A85E', tint: '#FCF1E0', text: '#B06B1E' },
  3: { solid: '#E3C765', tint: '#FAF6DE', text: '#8A752A' },
  4: { solid: '#8FB86A', tint: '#EEF5E6', text: '#4A6B2E' },
  5: { solid: '#6FB8A8', tint: '#E7F5F0', text: '#2A7A64' },
} as const satisfies Record<MoodLevel, { solid: string; tint: string; text: string }>;

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
