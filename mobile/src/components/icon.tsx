import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// 24x24 line icons drawn to match the Moodbloom design. One implementation for iOS, Android and
// the web verification build (SF Symbols do not render on web). To add an icon, add its shapes
// here; nothing else changes. Filled details use `currentColor`, which follows the `color` prop.
const ICONS = {
  'chevron-left': <Polyline points="15 18 9 12 15 6" />,
  'chevron-right': <Polyline points="9 18 15 12 9 6" />,
  person: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  // Insights: a pie with one slice pulled out.
  pie: (
    <>
      <Path d="M21 12a9 9 0 1 1-9-9v9z" />
      <Path d="M15 3.5A9 9 0 0 1 20.5 9H15z" fill="currentColor" />
    </>
  ),
  // Log a mood: a calendar with two days marked.
  calendar: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="3" />
      <Path d="M8 3v4M16 3v4M3 10h18" />
      <Circle cx="8" cy="15" r="1" fill="currentColor" />
      <Circle cx="12" cy="15" r="1" fill="currentColor" />
    </>
  ),
  edit: (
    <>
      <Path d="M4 20h4L19 9l-4-4L4 16z" />
      <Path d="M13 7l4 4" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  check: <Polyline points="20 6 9 17 4 12" />,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Decorative: the control that contains it carries the accessibility label. */
export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      color={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ICONS[name]}
    </Svg>
  );
}
