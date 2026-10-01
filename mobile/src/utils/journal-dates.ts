import type { EntryType } from '@/constants/journal';

import { pluralize } from './groups';
import { formatTime } from './local-date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `d` back to `now`, in the device's time zone (0 = today). */
function daysAgo(d: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);
}

/** "27 Sep", with the year when it is not this year. */
function dateLabel(d: Date, now: Date): string {
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/** "Today", "Yesterday" or "27 Sep". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const ago = daysAgo(d, now);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  return dateLabel(d, now);
}

/** "Yesterday, 11:20 pm" or "27 Sep, 11:20 pm". */
export function dayAndTime(iso: string, now: Date = new Date()): string {
  return `${dayLabel(iso, now)}, ${formatTime(iso)}`;
}

/** "Sat 27 Sep" for an entry's own page. */
export function longDay(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${dateLabel(d, now)}`;
}

interface DatedEntry {
  type: EntryType;
  createdAt: string;
  photoCount: number;
}

/** The grey line above a title: "Memory · 27 Sep · 3 photos" or "Note · Yesterday, 11:20 pm". */
export function entryMeta(entry: DatedEntry, now: Date = new Date()): string {
  const when =
    entry.type === 'note' ? dayAndTime(entry.createdAt, now) : dayLabel(entry.createdAt, now);
  const photos = entry.photoCount > 0 ? [pluralize(entry.photoCount, 'photo')] : [];
  return [entry.type === 'note' ? 'Note' : 'Memory', when, ...photos].join(' · ');
}
