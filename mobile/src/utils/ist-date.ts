const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * YYYY-MM-DD in IST (UTC+5:30), same rule as the backend's todayIST(). The server owns "today"
 * (`mood.date`, `checkedIn`); use this for chart axes and labels, not to decide check-in state.
 */
export function istDate(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istDaysAgo(days: number, now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  shifted.setUTCDate(shifted.getUTCDate() - days);
  return shifted.toISOString().slice(0, 10);
}

/** The last `days` IST dates, oldest first, ending today. */
export function istDateRange(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => istDaysAgo(days - 1 - i, now));
}
