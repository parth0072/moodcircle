const { db } = require('./db');

// Personal mood entries (the Moodbloom journal). Unlike the key/value stores this is a real
// table with an index, because every query is "this user's entries in a range of days".
db.exec(`
  CREATE TABLE IF NOT EXISTS mood_entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    emotion    TEXT NOT NULL,
    intensity  INTEGER NOT NULL,
    tags       TEXT NOT NULL DEFAULT '[]',
    note       TEXT NOT NULL DEFAULT '',
    entry_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries (user_id, entry_date);
`);

const insertRow = db.prepare(
  `INSERT INTO mood_entries (id, user_id, emotion, intensity, tags, note, entry_date, created_at, updated_at)
   VALUES (@id, @userId, @emotion, @intensity, @tags, @note, @date, @createdAt, @updatedAt)`
);
const selectOne = db.prepare('SELECT * FROM mood_entries WHERE id = ? AND user_id = ?');
const updateRow = db.prepare(
  `UPDATE mood_entries
      SET emotion = @emotion, intensity = @intensity, tags = @tags, note = @note, updated_at = @updatedAt
    WHERE id = @id AND user_id = @userId`
);
const deleteRow = db.prepare('DELETE FROM mood_entries WHERE id = ? AND user_id = ?');
const selectRange = db.prepare(
  `SELECT * FROM mood_entries
    WHERE user_id = ? AND entry_date BETWEEN ? AND ?
    ORDER BY entry_date, created_at`
);
const countAll = db.prepare('SELECT COUNT(*) AS n FROM mood_entries WHERE user_id = ?');
const selectFirstDay = db.prepare('SELECT MIN(entry_date) AS d FROM mood_entries WHERE user_id = ?');
const selectTopEmotion = db.prepare(
  `SELECT emotion FROM mood_entries
    WHERE user_id = ?
    GROUP BY emotion
    ORDER BY COUNT(*) DESC, MAX(created_at) DESC
    LIMIT 1`
);
const selectRecentDays = db.prepare(
  'SELECT DISTINCT entry_date AS d FROM mood_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT ?'
);

function toEntry(row) {
  return {
    id: row.id,
    emotion: row.emotion,
    intensity: row.intensity,
    tags: JSON.parse(row.tags),
    note: row.note,
    date: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function create(entry) {
  insertRow.run({ ...entry, tags: JSON.stringify(entry.tags) });
  return toEntry(selectOne.get(entry.id, entry.userId));
}

function get(id, userId) {
  const row = selectOne.get(id, userId);
  return row ? toEntry(row) : null;
}

function update(id, userId, fields) {
  updateRow.run({ id, userId, ...fields, tags: JSON.stringify(fields.tags) });
  return get(id, userId);
}

function remove(id, userId) {
  return deleteRow.run(id, userId).changes > 0;
}

function list(userId, from, to) {
  return selectRange.all(userId, from, to).map(toEntry);
}

function total(userId) {
  return countAll.get(userId).n;
}

function firstDay(userId) {
  return selectFirstDay.get(userId).d ?? null;
}

function topEmotion(userId) {
  return selectTopEmotion.get(userId)?.emotion ?? null;
}

// Distinct days with an entry, newest first (for streaks).
function recentDays(userId, limit) {
  return selectRecentDays.all(userId, limit).map((r) => r.d);
}

module.exports = { create, get, update, remove, list, total, firstDay, topEmotion, recentDays };
