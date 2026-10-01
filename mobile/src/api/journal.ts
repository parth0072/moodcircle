import { api } from '@/api';
import type { Emotion } from '@/constants/emotions';
import type { EntryType } from '@/constants/journal';
import { getApiUrl } from '@/utils/env';
import { readPhotoBytes } from '@/utils/photo-bytes';
import type { PickedPhoto } from '@/utils/pick-photos';

import { parseResponse } from './parse';
import { messageResponse } from './schemas/group';
import {
  journalEntryResponse,
  journalListResponse,
  lovesResponse,
  peopleResponse,
  photoResponse,
  replyResponse,
  sharesResponse,
  type JournalEntry,
  type JournalEntryDetail,
  type JournalPhoto,
  type Loves,
  type Person,
  type Reply,
  type SharePerson,
} from './schemas/journal';

export interface NewJournalEntry {
  type: EntryType;
  emotion: Emotion;
  title: string;
  body: string;
  /** Ids from uploadJournalPhoto, in the order to show them. */
  photoIds: string[];
}

/** What to change on an entry; `photoIds`, when given, is the complete new list. */
export type JournalEntryChanges = Partial<NewJournalEntry>;

export interface JournalFilter {
  type?: EntryType;
  /** Words to find in the title or the text. */
  q?: string;
}

export interface ShareRequest {
  recipientIds: string[];
  message: string;
  includePhotos: boolean;
}

// A phone on mobile data can take a while to send a photo.
const UPLOAD_TIMEOUT_MS = 60_000;

// The server sends photo links relative to the API root; an image view needs the whole address.
const withFullUrl = (photo: JournalPhoto): JournalPhoto => ({
  ...photo,
  url: `${getApiUrl()}${photo.url}`,
});

const withFullUrls = <T extends { photos: JournalPhoto[] }>(entry: T): T => ({
  ...entry,
  photos: entry.photos.map(withFullUrl),
});

const validSide = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20_000;

/** Your entries and the ones shared with you, newest first, one page at a time. */
export async function listJournal(
  filter: JournalFilter,
  before?: string,
): Promise<{ entries: JournalEntry[]; nextBefore: string | null }> {
  const parts: string[] = [];
  if (filter.type) parts.push(`type=${filter.type}`);
  const q = filter.q?.trim();
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  if (before) parts.push(`before=${encodeURIComponent(before)}`);
  const data = await api.get<unknown>(`/journal${parts.length ? `?${parts.join('&')}` : ''}`);
  const page = parseResponse(journalListResponse, data);
  return { entries: page.entries.map(withFullUrls), nextBefore: page.nextBefore };
}

/** One entry in full. Someone else's entry (or a deleted one) is an ApiError with code JOURNAL_NOT_FOUND. */
export async function getJournalEntry(id: string): Promise<JournalEntryDetail> {
  const data = await api.get<unknown>(`/journal/${id}`);
  return withFullUrls(parseResponse(journalEntryResponse, data).entry);
}

export async function createJournalEntry(input: NewJournalEntry): Promise<JournalEntryDetail> {
  const data = await api.post<unknown>('/journal', {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
  });
  return withFullUrls(parseResponse(journalEntryResponse, data).entry);
}

export async function updateJournalEntry(
  id: string,
  changes: JournalEntryChanges,
): Promise<JournalEntryDetail> {
  const data = await api.patch<unknown>(`/journal/${id}`, {
    ...changes,
    ...(changes.title === undefined ? null : { title: changes.title.trim() }),
    ...(changes.body === undefined ? null : { body: changes.body.trim() }),
  });
  return withFullUrls(parseResponse(journalEntryResponse, data).entry);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const data = await api.delete<unknown>(`/journal/${id}`);
  parseResponse(messageResponse, data);
}

/** Sends one photo; put the id it returns in the entry's `photoIds`. */
export async function uploadJournalPhoto(photo: PickedPhoto): Promise<JournalPhoto> {
  const size =
    validSide(photo.width) && validSide(photo.height)
      ? `?width=${photo.width}&height=${photo.height}`
      : '';
  const bytes = await readPhotoBytes(photo);
  const data = await api.postBytes<unknown>(`/journal/photos${size}`, bytes, photo.mimeType, {
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return withFullUrl(parseResponse(photoResponse, data).photo);
}

/** Who an entry can be sent to: the people in a group with you. */
export async function listSharePeople(): Promise<SharePerson[]> {
  const data = await api.get<unknown>('/journal/people');
  return parseResponse(peopleResponse, data).people;
}

/** The entry ends up shared with exactly these people (none stops sharing). */
export async function setJournalShares(id: string, request: ShareRequest): Promise<Person[]> {
  const data = await api.put<unknown>(`/journal/${id}/shares`, {
    recipientIds: request.recipientIds,
    message: request.message.trim(),
    includePhotos: request.includePhotos,
  });
  return parseResponse(sharesResponse, data).sharedWith;
}

/** Loves the entry, or takes the love back. */
export async function setJournalLove(id: string, on: boolean): Promise<Loves> {
  const data = on
    ? await api.put<unknown>(`/journal/${id}/love`)
    : await api.delete<unknown>(`/journal/${id}/love`);
  return parseResponse(lovesResponse, data).loves;
}

export async function addJournalReply(id: string, body: string): Promise<Reply> {
  const data = await api.post<unknown>(`/journal/${id}/replies`, { body: body.trim() });
  return parseResponse(replyResponse, data).reply;
}

export async function deleteJournalReply(id: string, replyId: string): Promise<void> {
  const data = await api.delete<unknown>(`/journal/${id}/replies/${replyId}`);
  parseResponse(messageResponse, data);
}
