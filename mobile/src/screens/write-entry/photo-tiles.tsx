import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import type { DraftPhoto } from '@/hooks/use-photo-draft';
import { accents, colors, radius } from '@/theme';

interface PhotoTilesProps {
  photos: DraftPhoto[];
  /** No room for another photo: the "Add photo" tile is left out. */
  full: boolean;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}

const TILE = 92;

/** The entry's photos as 92 pt tiles with a remove button, then the "Add photo" tile. */
export function PhotoTiles({ photos, full, onAdd, onRemove, onRetry }: PhotoTilesProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // Room above and to the right for the remove buttons that sit half outside their tiles.
      contentContainerStyle={styles.row}
    >
      {photos.map((photo, index) => (
        <View key={photo.key} style={styles.slot}>
          <Photo uri={photo.uri} label={`Photo ${index + 1}`} style={styles.tile} />
          {photo.status === 'uploading' ? (
            <View style={[styles.tile, styles.cover]} accessibilityLabel="Uploading photo">
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : null}
          {photo.status === 'failed' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry upload"
              onPress={() => onRetry(photo.key)}
              style={[styles.tile, styles.cover, styles.failed]}
            >
              <AppText variant="caption" style={styles.failedText}>
                Upload failed
              </AppText>
              <AppText variant="link" color="brand">
                Retry
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            hitSlop={8}
            onPress={() => onRemove(photo.key)}
            style={styles.remove}
          >
            <Icon name="x" size={10} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>
      ))}
      {full ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          onPress={onAdd}
          style={({ pressed }) => [styles.tile, styles.add, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="camera" size={24} color={colors.brand} />
          <AppText variant="bodySm" color="textSoft" style={styles.addText}>
            Add photo
          </AppText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingTop: 8, paddingRight: 14 },
  slot: { width: TILE, height: TILE },
  tile: { width: TILE, height: TILE, borderRadius: 18, borderCurve: 'continuous' },
  cover: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 246, 238, 0.7)',
  },
  failed: { gap: 2, borderWidth: 2, borderColor: accents.danger },
  failedText: { color: accents.danger, fontSize: 11, lineHeight: 14 },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.promptBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addText: { fontSize: 13 },
});
