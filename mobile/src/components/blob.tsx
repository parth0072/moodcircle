import Svg, { Path } from 'react-native-svg';

// Organic, slightly lopsided round shapes for the design's illustrations. React Native cannot draw
// the CSS "38% 62% 46% 54% / 52% 40% 60% 48%" corners, so each shape is a closed curve through
// points on a wobbly circle: radius = base * (1 + a2 * sin(2t + p2) + a3 * sin(3t + p3)).
const SHAPES = {
  calm: { a2: 0.13, p2: 0.6, a3: 0.08, p3: 1.9 },
  anger: { a2: 0.1, p2: 2.1, a3: 0.09, p3: 0.4 },
  meh: { a2: 0.14, p2: 4.0, a3: 0.07, p3: 1.2 },
} as const;

export type BlobShape = keyof typeof SHAPES;

const POINTS = 12;
const BASE = 40; // leaves room for the widest wobble inside the 100x100 box

function buildPath({ a2, p2, a3, p3 }: (typeof SHAPES)[BlobShape]): string {
  const pts = Array.from({ length: POINTS }, (_, i) => {
    const t = (i / POINTS) * Math.PI * 2;
    const r = BASE * (1 + a2 * Math.sin(2 * t + p2) + a3 * Math.sin(3 * t + p3));
    return [50 + r * Math.cos(t), 50 + r * Math.sin(t)] as const;
  });
  const at = (i: number) => pts[(i + POINTS) % POINTS];
  // Catmull-Rom to cubic Bezier, closed.
  let d = `M${at(0)[0].toFixed(2)} ${at(0)[1].toFixed(2)}`;
  for (let i = 0; i < POINTS; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return `${d} Z`;
}

const PATHS = {
  calm: buildPath(SHAPES.calm),
  anger: buildPath(SHAPES.anger),
  meh: buildPath(SHAPES.meh),
} as const;

interface BlobProps {
  shape: BlobShape;
  color: string;
  width: number;
  height: number;
}

/** A decorative organic blob, stretched to `width` x `height`. */
export function Blob({ shape, color, width, height }: BlobProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={PATHS[shape]} fill={color} />
    </Svg>
  );
}
