import Svg, { Circle, Path } from 'react-native-svg';

import { emotionLabels, type Emotion } from '@/constants/emotions';
import { colors, emotionColors } from '@/theme';

const ink = { fill: 'none', stroke: colors.ink, strokeWidth: 6, strokeLinecap: 'round' } as const;

/**
 * The features of each emotion, drawn for a face disc of radius 46 in a 100x100 box (the design's
 * emotion pills). Shared with FlowerFace, which scales them into a smaller outlined face.
 */
export function EmotionFeatures({ emotion }: { emotion: Emotion }) {
  switch (emotion) {
    case 'joy':
      return <Path d="M32 46 q7 -8 14 0 M54 46 q7 -8 14 0 M36 60 q14 14 28 0" {...ink} />;
    case 'calm':
      return <Path d="M32 46 h14 M54 46 h14 M40 60 q10 7 20 0" {...ink} />;
    case 'sad':
      return (
        <>
          <Circle cx="38" cy="44" r="5" fill={colors.ink} />
          <Circle cx="62" cy="44" r="5" fill={colors.ink} />
          <Path d="M36 70 q14 -12 28 0" {...ink} />
        </>
      );
    case 'worry':
      return (
        <Path
          d="M30 36 l12 7 l-12 7 M70 36 l-12 7 l12 7 M30 68 l8 -8 l8 8 l8 -8 l8 8 l8 -8"
          {...ink}
          strokeLinejoin="round"
        />
      );
    case 'anger':
      return (
        <>
          <Path d="M28 34 l16 8 M72 34 l-16 8 M36 70 q14 -12 28 0" {...ink} />
          <Circle cx="40" cy="50" r="5" fill={colors.ink} />
          <Circle cx="60" cy="50" r="5" fill={colors.ink} />
        </>
      );
    case 'meh':
      return <Path d="M30 44 h16 M54 44 h16 M34 64 q5 -5 10 0 q5 5 10 0 q5 -5 10 0" {...ink} />;
  }
}

interface EmotionFaceProps {
  emotion: Emotion;
  size?: number;
  /** Pass true when the face is the only thing telling the user the emotion (no text beside it). */
  labelled?: boolean;
}

/** A coloured disc with the emotion's face: the round icon in the Home pills. */
export function EmotionFace({ emotion, size = 32, labelled = false }: EmotionFaceProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={labelled ? emotionLabels[emotion] : undefined}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      <Circle cx="50" cy="50" r="46" fill={emotionColors[emotion]} />
      <EmotionFeatures emotion={emotion} />
    </Svg>
  );
}
