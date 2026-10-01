const { db } = require('./db');

// The journal: notes and memories with photos, who they are shared with, loves and replies. Real
// tables with indexes, like personal mood entries (entries.js): every query is "this person's
// entries" or "what was shared with this person". There are no foreign keys; removeEntry() clears
// everything that hangs off an entry in one transaction.
db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL,
    emotion    TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries (user_id, created_at);

  -- entry_id stays NULL from the upload until the photo is put on an entry.
  CREATE TABLE IF NOT EXISTS journal_photos (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    entry_id   TEXT,
    file       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    bytes      INTEGER NOT NULL,
    width      INTEGER,
    height     INTEGER,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_photos_entry ON journal_photos (entry_id, position);
  CREATE INDEX IF NOT EXISTS idx_journal_photos_user ON journal_photos (user_id, entry_id);

  CREATE TABLE IF NOT EXISTS journal_shares (
    entry_id       TEXT NOT NULL,
    recipient_id   TEXT NOT NULL,
    message        TEXT NOT NULL DEFAULT '',
    include_photos INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    PRIMARY KEY (entry_id, recipient_id)
  );
  CREATE INDEX IF NOT EXISTS idx_journal_shares_recipient ON journal_shares (recipient_id);

  CREATE TABLE IF NOT EXISTS journal_loves (
    entry_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (entry_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS journal_replies (
    id         TEXT PRIMARY KEY,
    entry_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_replies_entry ON journal_replies (entry_id, created_at);
`);

const marks = (list) => list.map(() => '?').join(',');

// ── Entries ───────────────────────────────────────────────────────────────────
const insertEntry = db.prepare(
  `INSERT INTO journal_entries (id, user_id, type, emotion, title, body, created_at, updated_at)
   VALUES (@id, @userId, @type, @emotion, @title, @body, @createdAt, @updatedAt)`
);
const selectEntry = db.prepare('SELECT * FROM journal_entries WHERE id = ?');
const updateEntryRow = db.prepare(
  `UPDATE journal_entries
      SET type = @type, emotion = @emotion, title = @title, body = @body, updated_at = @updatedAt
    WHERE id = @id`
);
// The person's own entries plus the ones shared with them, newest first.
const selectFeed = db.prepare(
  `SELECT e.*, s.message AS shared_message, s.include_photos AS include_photos
     FROM journal_entries e
     LEFT JOIN journal_shares s ON s.entry_id = e.id AND s.recipient_id = @me
    WHERE (e.user_id = @me OR s.recipient_id IS NOT NULL)
      AND (@type IS NULL OR e.type = @type)
      AND (@before IS NULL OR e.created_at < @before)
      AND (@like IS NULL OR e.title LIKE @like ESCAPE '\\' OR e.body LIKE @like ESCAPE '\\')
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT @limit`
);

function createEntry(entry) {
  insertEntry.run(entry);
  return selectEntry.get(entry.id);
}

function getEntry(id) {
  return selectEntry.get(id);
}

function updateEntry(entry) {
  updateEntryRow.run(entry);
  return selectEntry.get(entry.id);
}

/** `q` is plain words: wildcards in it are escaped so "50%" finds "50%". */
function feed(me, { type = null, q = null, before = null, limit }) {
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  return selectFeed.all({ me, type, before, like, limit });
}

// ── Photos ────────────────────────────────────────────────────────────────────
const insertPhoto = db.prepare(
  `INSERT INTO journal_photos (id, user_id, entry_id, file, mime, bytes, width, height, position, created_at)
   VALUES (@id, @userId, NULL, @file, @mime, @bytes, @width, @height, 0, @createdAt)`
);
const selectPhoto = db.prepare('SELECT * FROM journal_photos WHERE id = ?');
const selectPhotosOf = db.prepare('SELECT * FROM journal_photos WHERE entry_id = ? ORDER BY position');
const countLoose = db.prepare('SELECT COUNT(*) AS n FROM journal_photos WHERE user_id = ? AND entry_id IS NULL');
const selectStaleLoose = db.prepare(
  'SELECT * FROM journal_photos WHERE user_id = ? AND entry_id IS NULL AND created_at < ?'
);
const deletePhotoRow = db.prepare('DELETE FROM journal_photos WHERE id = ?');
const placePhoto = db.prepare('UPDATE journal_photos SET entry_id = ?, position = ? WHERE id = ?');

function addPhoto(photo) {
  insertPhoto.run(photo);
  return selectPhoto.get(photo.id);
}

function getPhoto(id) {
  return selectPhoto.get(id);
}

function photosOf(entryId) {
  return selectPhotosOf.all(entryId);
}

function photosOfMany(entryIds) {
  if (entryIds.length === 0) return [];
  return db
    .prepare(`SELECT * FROM journal_photos WHERE entry_id IN (${marks(entryIds)}) ORDER BY entry_id, position`)
    .all(...entryIds);
}

/** Uploaded but not (yet) on an entry. */
function looseCount(userId) {
  return countLoose.get(userId).n;
}

/** Drops this person's uploads that never reached an entry before `cutoff`; returns the rows (to delete the files). */
const clearStaleLoose = db.transaction((userId, cutoff) => {
  const stale = selectStaleLoose.all(userId, cutoff);
  stale.forEach((p) => deletePhotoRow.run(p.id));
  return stale;
});

/**
 * Makes `photoIds` the entry's photos, in that order. Photos that were on the entry and are not in
 * the list are deleted; the rows come back so the caller can delete the files.
 */
const setPhotos = db.transaction((entryId, photoIds) => {
  const dropped = selectPhotosOf.all(entryId).filter((p) => !photoIds.includes(p.id));
  dropped.forEach((p) => deletePhotoRow.run(p.id));
  photoIds.forEach((id, position) => placePhoto.run(entryId, position, id));
  return dropped;
});

// ── Shares ────────────────────────────────────────────────────────────────────
const selectShares = db.prepare('SELECT * FROM journal_shares WHERE entry_id = ? ORDER BY created_at');
const selectShare = db.prepare('SELECT * FROM journal_shares WHERE entry_id = ? AND recipient_id = ?');
const upsertShare = db.prepare(
  `INSERT INTO journal_shares (entry_id, recipient_id, message, include_photos, created_at)
   VALUES (@entryId, @recipientId, @message, @includePhotos, @createdAt)
   ON CONFLICT (entry_id, recipient_id)
   DO UPDATE SET message = excluded.message, include_photos = excluded.include_photos`
);

function sharesOf(entryId) {
  return selectShares.all(entryId);
}

function sharesOfMany(entryIds) {
  if (entryIds.length === 0) return [];
  return db
    .prepare(`SELECT * FROM journal_shares WHERE entry_id IN (${marks(entryIds)}) ORDER BY created_at`)
    .all(...entryIds);
}

function getShare(entryId, recipientId) {
  return selectShare.get(entryId, recipientId);
}

/** The entry ends up shared with exactly `recipientIds`: others lose access, these get the message. */
const setShares = db.transaction((entryId, recipientIds, { message, includePhotos, createdAt }) => {
  db.prepare(
    `DELETE FROM journal_shares WHERE entry_id = ? AND recipient_id NOT IN (${marks(recipientIds) || "''"})`
  ).run(entryId, ...recipientIds);
  recipientIds.forEach((recipientId) =>
    upsertShare.run({ entryId, recipientId, message, includePhotos: includePhotos ? 1 : 0, createdAt })
  );
});

// ── Loves and replies ─────────────────────────────────────────────────────────
const insertLove = db.prepare('INSERT OR IGNORE INTO journal_loves (entry_id, user_id, created_at) VALUES (?, ?, ?)');
const deleteLove = db.prepare('DELETE FROM journal_loves WHERE entry_id = ? AND user_id = ?');
const insertReply = db.prepare(
  `INSERT INTO journal_replies (id, entry_id, user_id, body, created_at)
   VALUES (@id, @entryId, @userId, @body, @createdAt)`
);
const selectReplies = db.prepare('SELECT * FROM journal_replies WHERE entry_id = ? ORDER BY created_at, id');
const selectReply = db.prepare('SELECT * FROM journal_replies WHERE id = ? AND entry_id = ?');
const deleteReply = db.prepare('DELETE FROM journal_replies WHERE id = ?');

function addLove(entryId, userId, createdAt) {
  insertLove.run(entryId, userId, createdAt);
}

function removeLove(entryId, userId) {
  deleteLove.run(entryId, userId);
}

/** entryId -> { count, mine } for the entries that have at least one love. */
function loveInfo(entryIds, me) {
  const info = new Map();
  if (entryIds.length === 0) return info;
  db.prepare(
    `SELECT entry_id, COUNT(*) AS n, SUM(user_id = ?) AS mine
       FROM journal_loves WHERE entry_id IN (${marks(entryIds)}) GROUP BY entry_id`
  )
    .all(me, ...entryIds)
    .forEach((r) => info.set(r.entry_id, { count: r.n, mine: r.mine > 0 }));
  return info;
}

function addReply(reply) {
  insertReply.run(reply);
}

function repliesOf(entryId) {
  return selectReplies.all(entryId);
}

function getReply(id, entryId) {
  return selectReply.get(id, entryId);
}

function removeReply(id) {
  deleteReply.run(id);
}

/** entryId -> number of replies, for the entries that have any. */
function replyCounts(entryIds) {
  const counts = new Map();
  if (entryIds.length === 0) return counts;
  db.prepare(`SELECT entry_id, COUNT(*) AS n FROM journal_replies WHERE entry_id IN (${marks(entryIds)}) GROUP BY entry_id`)
    .all(...entryIds)
    .forEach((r) => counts.set(r.entry_id, r.n));
  return counts;
}

// ── Delete ────────────────────────────────────────────────────────────────────
/** Removes the entry with its photos, shares, loves and replies; returns the photo rows (to delete the files). */
const removeEntry = db.transaction((id) => {
  const photos = selectPhotosOf.all(id);
  db.prepare('DELETE FROM journal_photos WHERE entry_id = ?').run(id);
  db.prepare('DELETE FROM journal_shares WHERE entry_id = ?').run(id);
  db.prepare('DELETE FROM journal_loves WHERE entry_id = ?').run(id);
  db.prepare('DELETE FROM journal_replies WHERE entry_id = ?').run(id);
  db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
  return photos;
});

module.exports = {
  createEntry,
  getEntry,
  updateEntry,
  feed,
  removeEntry,
  addPhoto,
  getPhoto,
  photosOf,
  photosOfMany,
  looseCount,
  clearStaleLoose,
  setPhotos,
  sharesOf,
  sharesOfMany,
  getShare,
  setShares,
  addLove,
  removeLove,
  loveInfo,
  addReply,
  repliesOf,
  getReply,
  removeReply,
  replyCounts,
};
