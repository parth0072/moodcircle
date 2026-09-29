import Svg, { Circle, Path } from 'react-native-svg';

import { colors, moodColors, moodLabels, type MoodLevel } from '@/theme';

const ink = { fill: 'none', stroke: colors.ink, strokeWidth: 3.5, strokeLinecap: 'round' } as const;

// Hand-drawn line-art faces, ported from MOOD_FACE in public/js/constants.js. Every face sits
// inside the same ink circle in a 100x100 box; only the inner features differ.
function Features({ level }: { level: MoodLevel }) {
  switch (level) {
    case 1:
      return (
        <>
          <Path d="M33 42 q7 6 14 0 M53 42 q7 6 14 0" {...ink} />
          <Path d="M36 68 q14 -12 28 0" {...ink} />
          {/* The tear is the one blue in the set: an illustration detail, not a palette colour. */}
          <Path
            d="M25 44 q-4 7 1 12"
            fill="none"
            stroke="#6BB5E8"
            strokeWidth={2.3}
            strokeLinecap="round"
          />
        </>
      );
    case 2:
      return (
        <>
          <Path d="M35 44 h11 M54 44 h11" {...ink} />
          <Path d="M37 65 q13 -8 26 0" {...ink} />
        </>
      );
    case 3:
      return (
        <>
          <Circle cx="40" cy="46" r="3" fill={colors.ink} />
          <Circle cx="60" cy="46" r="3" fill={colors.ink} />
          <Path d="M38 63 h24" {...ink} />
        </>
      );
    case 4:
      return (
        <>
          <Path d="M34 45 q6 -7 12 0 M54 45 q6 -7 12 0" {...ink} />
          <Path d="M36 58 q14 13 28 0" {...ink} />
        </>
      );
    case 5:
      return (
        <>
          <Path d="M33 44 q7 -9 14 0 M53 44 q7 -9 14 0" {...ink} />
          <Path d="M33 56 q17 16 34 0" {...ink} />
          <Path
            d="M81 22 v6 M78 25 h6"
            stroke={moodColors[2].solid}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Path
            d="M17 28 v5 M14.5 30.5 h5"
            stroke={moodColors[2].solid}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );
  }
}

interface MoodFaceProps {
  level: MoodLevel;
  size?: number;
  /** Pass true when the face is the only thing telling the user the mood (no text label beside it). */
  labelled?: boolean;
}

export function MoodFace({ level, size = 24, labelled = false }: MoodFaceProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={labelled ? moodLabels[level] : undefined}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      <Circle cx="50" cy="50" r="34" fill="none" stroke={colors.ink} strokeWidth={3.5} />
      <Features level={level} />
    </Svg>
  );
}
