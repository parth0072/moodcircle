import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Blob } from '@/components/blob';
import { Flower } from '@/components/flower';
import { emotionLabels, type Emotion } from '@/constants/emotions';
import { emotionColors, fontFamily } from '@/theme';
import type { RankedEmotion } from '@/utils/insights';

// The design's composition: five slots on a 390 x 250 canvas, biggest first. The emotion felt on
// most days takes the biggest slot, the next one the second, and so on; each emotion keeps its own
// shape. Only the five most felt emotions are drawn (the design has room for five).
const CANVAS = { width: 390, height: 250 };
const SLOTS = [
  { x: 196, y: 0, w: 170, h: 160 },
  { x: 20, y: 10, w: 150, h: 150 },
  { x: 130, y: 150, w: 104, h: 96 },
  { x: 36, y: 172, w: 76, h: 72 },
  { x: 262, y: 172, w: 80, h: 72 },
] as const;
const NAME_SIZE = [20, 20, 16, 14, 14];
const COUNT_SIZE = [13, 13, 12];

function Shape({ emotion, width, height }: { emotion: Emotion; width: number; height: number }) {
  const color = emotionColors[emotion];
  switch (emotion) {
    case 'joy':
      return (
        <Svg width={width} height={height} viewBox="0 0 100 100">
          <Flower color={color} />
        </Svg>
      );
    case 'calm':
    case 'anger':
      return <Blob shape={emotion} color={color} width={width} height={height} />;
    case 'meh':
      return (
        <View
          style={{
            width,
            height,
            borderRadius: width * 0.27,
            backgroundColor: color,
            transform: [{ rotate: '-8deg' }],
          }}
        />
      );
    default: // sad and worry: a plain round bubble
      return <View style={{ width, height, borderRadius: 999, backgroundColor: color }} />;
  }
}

/** How the week or month felt: one bubble per emotion, bigger for the ones felt on more days. */
export function MoodBlobs({ ranked }: { ranked: RankedEmotion[] }) {
  const { width } = useWindowDimensions();
  const scale = Math.min(width, 430) / CANVAS.width;
  return (
    <View
      style={{ width: CANVAS.width * scale, height: CANVAS.height * scale, alignSelf: 'center' }}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={ranked
        .map((r) => `${emotionLabels[r.emotion]}, ${r.days} ${r.days === 1 ? 'day' : 'days'}`)
        .join('. ')}
    >
      {ranked.slice(0, SLOTS.length).map((item, rank) => {
        const slot = SLOTS[rank];
        return (
          <View
            key={item.emotion}
            style={[
              styles.slot,
              {
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.w * scale,
                height: slot.h * scale,
              },
            ]}
          >
            <View style={styles.shape}>
              <Shape emotion={item.emotion} width={slot.w * scale} height={slot.h * scale} />
            </View>
            <AppText
              variant="titleMd"
              style={{
                fontSize: NAME_SIZE[rank] * scale,
                lineHeight: NAME_SIZE[rank] * scale * 1.25,
              }}
            >
              {emotionLabels[item.emotion]}
            </AppText>
            {rank < COUNT_SIZE.length ? (
              <AppText
                variant="caption"
                color="textSoft"
                style={{ fontSize: COUNT_SIZE[rank] * scale, fontFamily: fontFamily.body.regular }}
              >
                {`${item.days} ${item.days === 1 ? 'day' : 'days'}`}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  shape: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
