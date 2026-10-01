import { useRef, useState } from 'react';

import { uploadJournalPhoto } from '@/api/journal';
import type { JournalPhoto } from '@/api/schemas/journal';
import { PHOTOS_MAX } from '@/constants/journal';
import type { PickedPhoto } from '@/utils/pick-photos';

export interface DraftPhoto {
  /** Stable for the life of the draft (the server id for a photo that was already saved). */
  key: string;
  /** What to show: the chosen file while it uploads and after, the server link for a saved photo. */
  uri: string;
  status: 'uploading' | 'ready' | 'failed';
  /** The server's id once the photo is there. */
  id?: string;
  /** Kept so a failed upload can be tried again. */
  picked?: PickedPhoto;
}

/**
 * The photos of an entry being written. A photo uploads as soon as it is chosen, so the tile shows
 * its own progress and a failure can be retried or removed; saving only sends the ids. `initial`
 * is the photos the entry already has.
 */
export function usePhotoDraft(initial: JournalPhoto[] = []) {
  const [photos, setPhotos] = useState<DraftPhoto[]>(() =>
    initial.map((p) => ({ key: p.id, uri: p.url, status: 'ready', id: p.id })),
  );
  const counter = useRef(0);

  const patch = (key: string, change: Partial<DraftPhoto>) =>
    setPhotos((list) => list.map((p) => (p.key === key ? { ...p, ...change } : p)));

  const upload = (key: string, picked: PickedPhoto) => {
    patch(key, { status: 'uploading' });
    uploadJournalPhoto(picked).then(
      (saved) => patch(key, { status: 'ready', id: saved.id }),
      () => patch(key, { status: 'failed' }),
    );
  };

  /** Adds what fits (the entry holds PHOTOS_MAX) and starts uploading it. */
  const add = (picked: PickedPhoto[]) => {
    const room = Math.max(0, PHOTOS_MAX - photos.length);
    const fresh = picked.slice(0, room).map((p) => {
      counter.current += 1;
      return { key: `new-${counter.current}`, picked: p };
    });
    setPhotos((list) => [
      ...list,
      ...fresh.map(({ key, picked: p }) => ({
        key,
        uri: p.uri,
        status: 'uploading' as const,
        picked: p,
      })),
    ]);
    fresh.forEach(({ key, picked: p }) => upload(key, p));
  };

  const remove = (key: string) => setPhotos((list) => list.filter((p) => p.key !== key));

  const retry = (key: string) => {
    const photo = photos.find((p) => p.key === key);
    if (photo?.picked) upload(key, photo.picked);
  };

  return {
    photos,
    add,
    remove,
    retry,
    /** Ids of the photos that are on the server, in order. */
    ids: photos.flatMap((p) => (p.status === 'ready' && p.id ? [p.id] : [])),
    uploading: photos.some((p) => p.status === 'uploading'),
    failed: photos.some((p) => p.status === 'failed'),
    full: photos.length >= PHOTOS_MAX,
  };
}
