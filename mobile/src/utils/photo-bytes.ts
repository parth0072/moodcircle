import { File } from 'expo-file-system';

import type { PickedPhoto } from './pick-photos';

/** The photo's bytes, ready to be a request body. */
export async function readPhotoBytes(photo: PickedPhoto): Promise<Uint8Array<ArrayBuffer>> {
  // A browser hands over its own File. The file-system module has nothing to read on the web.
  if (photo.file) return new Uint8Array(await photo.file.arrayBuffer());
  if (process.env.EXPO_OS === 'web') {
    return new Uint8Array(await (await fetch(photo.uri)).arrayBuffer());
  }
  return new Uint8Array(await new File(photo.uri).arrayBuffer());
}
