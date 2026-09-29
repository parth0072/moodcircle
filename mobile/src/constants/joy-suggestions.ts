/** "Things that make you feel good": the suggestion chips (JOY_SUGGESTIONS in the web's onboarding.js). */
export const JOY_SUGGESTIONS = [
  'Listening to music',
  'Going for a walk',
  'Calling a friend',
  'Dancing',
  'Journaling',
  'Cooking something',
  'Reading',
  'Napping',
  'Playing a game',
  'Exercising',
  'Meditating',
  'Watching a comfort show',
] as const;

/** The backend accepts at most 12 activities (more is a 422). */
export const MAX_JOY_ACTIVITIES = 12;
/** The backend cuts each activity to 60 characters. */
export const MAX_JOY_LENGTH = 60;
