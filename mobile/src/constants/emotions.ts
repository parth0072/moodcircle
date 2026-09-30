// The six emotions of the Moodbloom design, in the order the Home screen lists them. The server
// accepts exactly these ids (src/routes/entry.routes.js). Keep this file free of React Native
// imports: api/schemas loads it under plain Node for scripts/contract-check.mjs.
export const EMOTIONS = ['joy', 'calm', 'sad', 'worry', 'anger', 'meh'] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const emotionLabels: Record<Emotion, string> = {
  joy: 'Joy',
  calm: 'Calm',
  sad: 'Sad',
  worry: 'Worry',
  anger: 'Anger',
  meh: 'Meh',
};

/** How strong an entry was, 1 to 5 (the Log screen's "How strong?" labels). */
export const INTENSITY_LABELS = ['A little', 'Mild', 'Moderate', 'Strong', 'Very strong'] as const;

/** The tags offered under "What's behind it?". The server takes any short tag; these are the design's. */
export const ENTRY_TAGS = [
  'Work',
  'Family',
  'Friends',
  'Sleep',
  'Exercise',
  'Music',
  'Weather',
  'Food',
] as const;
