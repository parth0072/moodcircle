import Svg, { G } from 'react-native-svg';

import { emotionLabels, type Emotion } from '@/constants/emotions';
import { emotionColors } from '@/theme';

import { Flower } from './flower';
import { OutlineFaceShapes } from './outline-face';

interface FlowerFaceProps {
  emotion: Emotion;
  size?: number;
  /** Pass true when the illustration is the only thing naming the emotion. */
  labelled?: boolean;
}

/**
 * The big illustration on the log screen: a bloom in the emotion's colour with an outlined face
 * in the middle (joy also blushes). The features are the pill features scaled into the outline,
 * so all six emotions look like one family.
 */
export function FlowerFace({ emotion, size = 188, labelled = false }: FlowerFaceProps) {
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
      <Flower color={emotionColors[emotion]} />
      <G transform="translate(20 20) scale(.6)">
        <OutlineFaceShapes emotion={emotion} />
      </G>
    </Svg>
  );
}
