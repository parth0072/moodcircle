import { StyleSheet, View } from 'react-native';

import type { GroupColor } from '@/constants/groups';
import { fontFamily, groupColors, groupOnColor } from '@/theme';
import { initialOf } from '@/utils/groups';

import { AppText } from './app-text';

interface GroupTileProps {
  name: string;
  color: GroupColor;
  size: number;
  cornerRadius: number;
  fontSize: number;
}

/** The rounded square with a group's first letter, in the colour the group was given. */
export function GroupTile({ name, color, size, cornerRadius, fontSize }: GroupTileProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: cornerRadius,
          backgroundColor: groupColors[color],
        },
      ]}
    >
      <AppText
        style={{
          fontFamily: fontFamily.display.bold,
          fontSize,
          lineHeight: Math.round(fontSize * 1.2),
          color: groupOnColor[color],
        }}
      >
        {initialOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
