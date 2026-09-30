// Calendar days as the user lives them: the device's own time zone, written YYYY-MM-DD. The server
// has no time zone for a user, so the app sends its local day with every entry and every query.

const pad = (n: number) => String(n).padStart(2, '0');

export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** The `n` days ending on `today`, oldest first. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** M T W T F S S, for the week row: the weekday initial of a day. */
export function weekdayInitial(date: string): string {
  return 'SMTWTFS'[parse(date).getDay()];
}

/** "Good morning!", "Good afternoon!" or "Good evening!" for the hour of `d`. */
export function greeting(d: Date = new Date()): string {
  const hour = d.getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 18) return 'Good afternoon!';
  return 'Good evening!';
}

/** "8:42 pm" in the device's own style. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

/** "Checking in since March" (this year) or "Checking in since March 2025"; a fresh account has no start yet. */
export function sinceLabel(firstEntryDate: string | null, today: string): string {
  if (!firstEntryDate) return 'Just getting started';
  const first = parse(firstEntryDate);
  const month = first.toLocaleDateString([], { month: 'long' });
  return first.getFullYear() === parse(today).getFullYear()
    ? `Checking in since ${month}`
    : `Checking in since ${month} ${first.getFullYear()}`;
}
