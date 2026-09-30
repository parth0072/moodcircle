// Calendar-day helpers for personal mood entries. A "date" is a YYYY-MM-DD string:
// the user's own local day, sent by the app (the server has no time zone for them).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rejects 2026-02-31
}

function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Whole days from b to a (a - b).
function diffDays(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { isValidDate, addDays, diffDays, todayUTC };
