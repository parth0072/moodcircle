import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { JournalPhoto } from '@/api/schemas/journal';
import { Photo } from '@/components/photo';
import { colors, radius } from '@/theme';

interface PhotoCarouselProps {
  photos: JournalPhoto[];
  height: number;
}

/** The entry's photos, one per screen width, swiped sideways, with the design's dots below. */
export function PhotoCarousel({ photos, height }: PhotoCarouselProps) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<JournalPhoto>>(null);
  const [current, setCurrent] = useState(0);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));

  const show = (index: number) => {
    setCurrent(index);
    list.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={{ height, width }}>
      <FlatList
        ref={list}
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item, index }) => (
          <Photo
            uri={item.url}
            label={`Photo ${index + 1} of ${photos.length}`}
            style={{ width, height }}
          />
        )}
      />
      {photos.length > 1 ? (
        // Above the sheet's rounded top, as in the design.
        <View style={styles.dots}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${index + 1}`}
              accessibilityState={{ selected: index === current }}
              onPress={() => show(index)}
              style={styles.dotTarget}
            >
              <View style={[styles.dot, index === current ? styles.dotOn : null]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dotTarget: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(30, 42, 90, 0.35)',
  },
  dotOn: { width: 20, backgroundColor: colors.ink },
});
