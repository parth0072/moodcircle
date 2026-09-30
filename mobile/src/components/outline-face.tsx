import Svg, { Circle, Ellipse, G } from 'react-native-svg';

import { emotionLabels, type Emotion } from '@/constants/emotions';
import { accents, colors } from '@/theme';

import { EmotionFeatures } from './emotion-face';

/**
 * The line-art face used on the big illustrations: an ink circle of radius 34 in a 100x100 box,
 * with the pill features scaled to fit inside it (joy blushes). Draw it inside a `Svg`.
 */
export function OutlineFaceShapes({
  emotion,
  strokeWidth = 4.5,
}: {
  emotion: Emotion;
  strokeWidth?: number;
}) {
  return (
    <G>
      <Circle cx="50" cy="50" r="34" fill="none" stroke={colors.ink} strokeWidth={strokeWidth} />
      <G transform="translate(50 50) scale(.74) translate(-50 -50)">
        <EmotionFeatures emotion={emotion} />
      </G>
      {emotion === 'joy' ? (
        <>
          <Ellipse cx="31" cy="58" rx="5" ry="3" fill={accents.strength} />
          <Ellipse cx="69" cy="58" rx="5" ry="3" fill={accents.strength} />
        </>
      ) : null}
    </G>
  );
}

interface OutlineFaceProps {
  emotion: Emotion;
  size?: number;
  strokeWidth?: number;
  labelled?: boolean;
}

export function OutlineFace({ emotion, size = 112, strokeWidth = 3, labelled }: OutlineFaceProps) {
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
      <OutlineFaceShapes emotion={emotion} strokeWidth={strokeWidth} />
    </Svg>
  );
}
