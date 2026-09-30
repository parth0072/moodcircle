import Svg, { Circle, G, Rect } from 'react-native-svg';

import { Flower } from '@/components/flower';
import { OutlineFaceShapes } from '@/components/outline-face';
import { accents, emotionColors } from '@/theme';

/**
 * The welcome illustration: a joyful bloom with four confetti shapes around it, drawn in the
 * design's 300x300 space (so its numbers are the design's).
 */
export function WelcomeArt({ size = 300 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Flower color={emotionColors.joy} cx={150} cy={150} centre={78} ring={82} petal={26} />
      <G transform="translate(90 90) scale(1.2)">
        <OutlineFaceShapes emotion="joy" strokeWidth={3} />
      </G>
      <Circle cx={36} cy={60} r={22} fill={accents.sun} />
      <Rect
        x={238}
        y={30}
        width={44}
        height={44}
        rx={12}
        fill={emotionColors.calm}
        transform="rotate(12 260 52)"
      />
      <Circle cx={262} cy={250} r={16} fill={emotionColors.sad} />
      <Rect
        x={24}
        y={230}
        width={38}
        height={38}
        rx={10}
        fill={emotionColors.meh}
        transform="rotate(-10 43 249)"
      />
    </Svg>
  );
}
