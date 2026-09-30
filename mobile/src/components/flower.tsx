import { Circle, G } from 'react-native-svg';

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

interface FlowerProps {
  color: string;
  /** Centre of the bloom in the parent `Svg`'s coordinates (default: the middle of a 100x100 box). */
  cx?: number;
  cy?: number;
  /** Radius of the round middle, of the ring the petals sit on, and of each petal. */
  centre?: number;
  ring?: number;
  petal?: number;
}

/**
 * The design's "bloom": a round centre with eight round petals, in one colour. Draw it inside a
 * `Svg` (see FlowerFace, the welcome art and the insights blobs). The defaults fill a 100x100 box.
 */
export function Flower({
  color,
  cx = 50,
  cy = 50,
  centre = 36,
  ring = 38,
  petal = 12,
}: FlowerProps) {
  return (
    <G fill={color}>
      <Circle cx={cx} cy={cy} r={centre} />
      {ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Circle
            key={deg}
            cx={cx + ring * Math.cos(rad)}
            cy={cy + ring * Math.sin(rad)}
            r={petal}
          />
        );
      })}
    </G>
  );
}
