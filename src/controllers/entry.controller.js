const crypto = require('crypto');
const entries = require('../stores/entries');
const { ok, fail } = require('../utils/response');
const { todayIST } = require('../utils/timezone');
const { diffDays, todayUTC } = require('../utils/dates');
const { currentStreak } = require('../utils/entry-stats');
const { syncAutoShare } = require('../utils/auto-share');

const MAX_RANGE_DAYS = 366;
const STREAK_LOOKBACK_DAYS = 400;

// Tags: trimmed, blanks dropped, duplicates (ignoring case) collapsed to the first spelling.
function cleanTags(tags = []) {
  const seen = new Map();
  for (const t of tags) {
    const tag = String(t).trim();
    if (tag && !seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag);
  }
  return [...seen.values()];
}

// The app sends the user's local day. Every real time zone is within a day of UTC, so anything
// further away is a wrong clock or a made-up date, not "today".
function isLoggableDay(day) {
  return Math.abs(diffDays(day, todayUTC())) <= 1;
}

// POST /entries
function createEntry(req, res) {
  const { emotion, intensity, tags, note, date } = req.body;
  const day = date || todayIST();
  if (!isLoggableDay(day)) {
    return fail(res, 'Entries can only be logged for today', 'INVALID_DATE', 422);
  }

  const now = new Date().toISOString();
  const entry = entries.create({
    id: crypto.randomUUID(),
    userId: req.user.id,
    emotion,
    intensity,
    tags: cleanTags(tags),
    note: (note || '').trim(),
    date: day,
    createdAt: now,
    updatedAt: now,
  });
  syncAutoShare(req.user.id); // groups the user shares their daily mood with
  return ok(res, { entry }, 201);
}

// GET /entries?from=YYYY-MM-DD&to=YYYY-MM-DD  (oldest first)
function listEntries(req, res) {
  const { from, to } = req.query;
  if (to < from) {
    return fail(res, '"to" must not be before "from"', 'INVALID_RANGE', 422);
  }
  if (diffDays(to, from) >= MAX_RANGE_DAYS) {
    return fail(res, `The range can be at most ${MAX_RANGE_DAYS} days`, 'INVALID_RANGE', 422);
  }
  return ok(res, { entries: entries.list(req.user.id, from, to) });
}

// PATCH /entries/:id  (the day of an entry never changes)
function updateEntry(req, res) {
  const { id } = req.params;
  const existing = entries.get(id, req.user.id);
  if (!existing) return fail(res, 'Entry not found', 'ENTRY_NOT_FOUND', 404);

  const { emotion, intensity, tags, note } = req.body;
  if ([emotion, intensity, tags, note].every((v) => v === undefined)) {
    return fail(res, 'Nothing to update', 'VALIDATION_ERROR', 422);
  }

  const entry = entries.update(id, req.user.id, {
    emotion: emotion ?? existing.emotion,
    intensity: intensity ?? existing.intensity,
    tags: tags === undefined ? existing.tags : cleanTags(tags),
    note: note === undefined ? existing.note : note.trim(),
    updatedAt: new Date().toISOString(),
  });
  syncAutoShare(req.user.id);
  return ok(res, { entry });
}

// DELETE /entries/:id
function deleteEntry(req, res) {
  if (!entries.remove(req.params.id, req.user.id)) {
    return fail(res, 'Entry not found', 'ENTRY_NOT_FOUND', 404);
  }
  syncAutoShare(req.user.id);
  return ok(res, { message: 'Entry deleted' });
}

// GET /entries/stats?date=YYYY-MM-DD  (date = the user's own today)
function getStats(req, res) {
  const userId = req.user.id;
  return ok(res, {
    stats: {
      total: entries.total(userId),
      currentStreak: currentStreak(entries.recentDays(userId, STREAK_LOOKBACK_DAYS), req.query.date),
      topEmotion: entries.topEmotion(userId),
      firstEntryDate: entries.firstDay(userId),
    },
  });
}

module.exports = { createEntry, listEntries, updateEntry, deleteEntry, getStats };
