import { api } from '@/api';
import type { Emotion } from '@/constants/emotions';

import { parseResponse } from './parse';
import {
  deleteEntryResponse,
  entriesResponse,
  entryResponse,
  entryStatsResponse,
  type Entry,
  type EntryStats,
} from './schemas/entry';

export interface NewEntry {
  emotion: Emotion;
  /** How strong, 1 to 5. */
  intensity: number;
  tags?: string[];
  note?: string;
  /** The user's own local day, YYYY-MM-DD. The server only accepts today. */
  date: string;
}

export type EntryPatch = Partial<Pick<Entry, 'emotion' | 'intensity' | 'tags' | 'note'>>;

export async function createEntry(entry: NewEntry): Promise<Entry> {
  const data = await api.post<unknown>('/entries', entry);
  return parseResponse(entryResponse, data).entry;
}

/** Entries from `from` to `to` inclusive (local days), oldest first. At most 366 days. */
export async function listEntries(from: string, to: string): Promise<Entry[]> {
  const data = await api.get<unknown>(`/entries?from=${from}&to=${to}`);
  return parseResponse(entriesResponse, data).entries;
}

/** The day of an entry never changes. */
export async function updateEntry(id: string, patch: EntryPatch): Promise<Entry> {
  const data = await api.patch<unknown>(`/entries/${id}`, patch);
  return parseResponse(entryResponse, data).entry;
}

export async function deleteEntry(id: string): Promise<void> {
  const data = await api.delete<unknown>(`/entries/${id}`);
  parseResponse(deleteEntryResponse, data);
}

/** Totals for the profile. `today` is the user's own local day (the streak needs it). */
export async function getEntryStats(today: string): Promise<EntryStats> {
  const data = await api.get<unknown>(`/entries/stats?date=${today}`);
  return parseResponse(entryStatsResponse, data).stats;
}
