import Svg, { Path } from 'react-native-svg';

/** The horizon icon above the greeting. */
export function Sunset() {
  return (
    <Svg
      width={64}
      height={48}
      viewBox="0 0 64 48"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={3}
      strokeLinecap="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M16 22a16 16 0 0 1 32 0" />
      <Path d="M6 24h52M14 32h30M22 40h12" />
    </Svg>
  );
}
