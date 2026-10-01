import * as ImagePicker from 'expo-image-picker';

/** A photo the person chose, not uploaded yet. */
export interface PickedPhoto {
  /** Where the picker left it: a file path on a phone, a blob address in a browser. */
  uri: string;
  width: number;
  height: number;
  /** One of the types the server keeps: image/jpeg, image/png or image/webp. */
  mimeType: string;
  /** Web only: the browser's own File, which the bytes are read from. */
  file?: Blob;
}

const KEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The picker re-encodes as JPEG (quality below 1), so JPEG is the safe answer when it does not say.
function keptType(asset: ImagePicker.ImagePickerAsset): string {
  const said = asset.mimeType?.toLowerCase().replace('image/jpg', 'image/jpeg');
  if (said && KEPT_TYPES.includes(said)) return said;
  const name = (asset.fileName ?? asset.uri).toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function toPickedPhoto(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: keptType(asset),
    file: asset.file,
  };
}

/**
 * Opens the photo library for up to `limit` photos; an empty list when the person backs out. The
 * system picker needs no permission: it only hands over what the person selects.
 */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 0.8,
    // HEIC becomes JPEG on an iPhone: the server does not keep HEIC.
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];
  // A browser's file dialog ignores the limit.
  return result.assets.slice(0, limit).map(toPickedPhoto);
}
