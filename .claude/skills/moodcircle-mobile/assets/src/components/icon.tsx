import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { colors } from '@/theme';

// Feather-style 24x24 line icons, copied from the inline SVGs in public/index.html so the app
// keeps the web's drawing. One implementation for iOS, Android and the web verification build
// (SF Symbols do not render on web, and would make the app's chrome look unlike the mood faces).
// To add an icon, copy its <path>/<polyline>/<circle>/<line> here; nothing else changes.
const ICONS = {
  home: (
    <>
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  activity: <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  plus: (
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  zap: <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  user: (
    <>
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </>
  ),
  'chevron-left': <Polyline points="15 18 9 12 15 6" />,
  'chevron-right': <Polyline points="9 18 15 12 9 6" />,
  'chevron-down': <Polyline points="6 9 12 15 18 9" />,
  'log-out': <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  'refresh-cw': (
    <>
      <Polyline points="23 4 23 10 17 10" />
      <Path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </>
  ),
  'share-2': (
    <>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** The web uses 1.7 in the tab bar and 2 to 2.5 elsewhere. */
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
