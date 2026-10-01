const crypto = require('crypto');
const { groups, users } = require('../stores');
const journal = require('../stores/journal');
const photos = require('../utils/journal-photos');
const { ok, fail } = require('../utils/response');

const MAX_PHOTOS = 6;
const MAX_LOOSE_PHOTOS = 30; // uploaded but not on an entry yet
const LOOSE_PHOTO_TTL_MS = 24 * 60 * 60 * 1000;
const EXCERPT_LENGTH = 160;

const now = () => new Date().toISOString();
const person = (id) => {
  const u = users.get(id);
  return { id, name: u?.name || null };
};

// What the person may do with an entry: the owner can do everything, someone it was shared with
// can read it, love it and reply. Anyone else gets "not found" (never "forbidden": the entry's
// existence is private).
function accessTo(entry, userId) {
  if (!entry) return null;
  if (entry.user_id === userId) return { isOwner: true, share: null };
  const share = journal.getShare(entry.id, userId);
  return share ? { isOwner: false, share } : null;
}

function excerptOf(body) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : text;
}

const presentPhoto = (p) => ({ id: p.id, url: photos.photoUrl(p.id), width: p.width, height: p.height });

/**
 * Entries as the viewer sees them. The related rows are fetched once for the whole page, not once
 * per entry. `rows` may be entries the viewer owns or ones shared with them (shared_message and
 * include_photos come from the feed query; for a single entry the caller passes the share).
 */
function present(rows, viewerId, { detail = false } = {}) {
  const ids = rows.map((r) => r.id);
  const photosBy = groupBy(journal.photosOfMany(ids), 'entry_id');
  const sharesBy = groupBy(journal.sharesOfMany(ids), 'entry_id');
  const loves = journal.loveInfo(ids, viewerId);
  const replyCounts = journal.replyCounts(ids);

  return rows.map((row) => {
    const isMine = row.user_id === viewerId;
    // Someone it was shared with sees the photos only if the owner chose to send them.
    const visible = isMine || row.include_photos === 1 ? (photosBy.get(row.id) ?? []) : [];
    const entry = {
      id: row.id,
      type: row.type,
      emotion: row.emotion,
      title: row.title,
      excerpt: excerptOf(row.body),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isMine,
      owner: person(row.user_id),
      photos: visible.map(presentPhoto),
      photoCount: visible.length,
      sharedWith: isMine ? (sharesBy.get(row.id) ?? []).map((s) => person(s.recipient_id)) : [],
      sharedMessage: isMine ? null : row.shared_message || null,
      loves: loves.get(row.id) ?? { count: 0, mine: false },
      replyCount: replyCounts.get(row.id) ?? 0,
    };
    if (detail) {
      entry.body = row.body;
      entry.replies = journal.repliesOf(row.id).map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.created_at,
        author: person(r.user_id),
        isMine: r.user_id === viewerId,
      }));
    }
    return entry;
  });
}

function groupBy(list, key) {
  const map = new Map();
  list.forEach((item) => map.set(item[key], [...(map.get(item[key]) ?? []), item]));
  return map;
}

// The entry as one viewer sees it, with what a share adds for them.
function presentOne(entryRow, viewerId, access) {
  const row = access.isOwner
    ? entryRow
    : { ...entryRow, shared_message: access.share.message, include_photos: access.share.include_photos };
  return present([row], viewerId, { detail: true })[0];
}

// People who share at least one group with the person: everyone an entry can be sent to.
function sharedGroupPeople(userId) {
  const people = new Map();
  for (const g of groups.values()) {
    if (!g.members.includes(userId)) continue;
    for (const id of g.members) {
      if (id === userId) continue;
      const u = users.get(id);
      if (!u) continue;
      const entry = people.get(id) ?? {
        id,
        name: u.name || null,
        username: u.username || null,
        avatar: u.avatar || null,
        groups: [],
      };
      entry.groups.push({ id: g.id, name: g.name });
      people.set(id, entry);
    }
  }
  return people;
}

// Photos named in a request must be this person's own, and free or already on this entry.
function checkPhotoIds(photoIds, userId, entryId) {
  if (new Set(photoIds).size !== photoIds.length) return 'A photo can only be added once';
  for (const id of photoIds) {
    const p = journal.getPhoto(id);
    if (!p || p.user_id !== userId || (p.entry_id && p.entry_id !== entryId)) return 'Photo not found';
  }
  return null;
}

function deleteFiles(rows) {
  rows.forEach((p) => photos.remove(p.file));
}

// POST /journal/photos   (the raw image as the request body, Content-Type image/jpeg|png|webp)
function uploadPhoto(req, res) {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return fail(res, 'Send the photo as the request body (JPEG, PNG or WebP)', 'UNSUPPORTED_PHOTO', 415);
  }
  const mime = photos.sniffType(buf);
  if (!mime) return fail(res, 'Photos must be JPEG, PNG or WebP', 'UNSUPPORTED_PHOTO', 415);

  const userId = req.user.id;
  deleteFiles(journal.clearStaleLoose(userId, new Date(Date.now() - LOOSE_PHOTO_TTL_MS).toISOString()));
  if (journal.looseCount(userId) >= MAX_LOOSE_PHOTOS) {
    return fail(res, 'Too many photos waiting to be saved. Save or delete an entry first.', 'TOO_MANY_PHOTOS', 429);
  }

  const id = crypto.randomUUID();
  const file = photos.save(id, buf, mime);
  const photo = journal.addPhoto({
    id,
    userId,
    file,
    mime,
    bytes: buf.length,
    width: req.query.width ?? null,
    height: req.query.height ?? null,
    createdAt: now(),
  });
  return ok(res, { photo: presentPhoto(photo) }, 201);
}

// GET /journal/photos/:id/file?e=&s=   (no login header: the link itself is the proof)
function getPhotoFile(req, res) {
  const { id } = req.params;
  const photo = journal.getPhoto(id);
  if (!photo || !photos.verifyLink(id, req.query.e, req.query.s)) {
    return fail(res, 'Photo not found', 'PHOTO_NOT_FOUND', 404);
  }
  res.set({ 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
  // The name is ours (an id and an extension); a dot in the folder's path must not make it vanish.
  return res.type(photo.mime).sendFile(photos.pathOf(photo.file), { dotfiles: 'allow' });
}

// POST /journal
function createEntry(req, res) {
  const userId = req.user.id;
  const { type, emotion, title, body = '', photoIds = [] } = req.body;
  const id = crypto.randomUUID();

  const problem = checkPhotoIds(photoIds, userId, id);
  if (problem) return fail(res, problem, 'PHOTO_NOT_FOUND', 422);

  const stamp = now();
  const row = journal.createEntry({
    id,
    userId,
    type,
    emotion,
    title: title.trim(),
    body: body.trim(),
    createdAt: stamp,
    updatedAt: stamp,
  });
  journal.setPhotos(id, photoIds);
  return ok(res, { entry: presentOne(row, userId, { isOwner: true }) }, 201);
}

// GET /journal?type=&q=&before=&limit=
function listEntries(req, res) {
  const userId = req.user.id;
  const { type, q, before, limit } = req.query;
  const rows = journal.feed(userId, { type, q: q?.trim() || null, before, limit: limit + 1 });
  const page = rows.slice(0, limit);
  return ok(res, {
    entries: present(page, userId),
    // Pass this back as `before` for the next page; null when there are no more.
    nextBefore: rows.length > limit ? page[page.length - 1].created_at : null,
  });
}

// GET /journal/people
function listPeople(req, res) {
  const people = [...sharedGroupPeople(req.user.id).values()].sort((a, b) =>
    (a.name || a.username || '').localeCompare(b.name || b.username || '')
  );
  return ok(res, { people });
}

// GET /journal/:id
function getEntry(req, res) {
  const row = journal.getEntry(req.params.id);
  const access = accessTo(row, req.user.id);
  if (!access) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);
  return ok(res, { entry: presentOne(row, req.user.id, access) });
}

// PATCH /journal/:id
function updateEntry(req, res) {
  const userId = req.user.id;
  const row = journal.getEntry(req.params.id);
  if (!row || row.user_id !== userId) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);

  const { type, emotion, title, body, photoIds } = req.body;
  if ([type, emotion, title, body, photoIds].every((v) => v === undefined)) {
    return fail(res, 'Nothing to update', 'VALIDATION_ERROR', 422);
  }
  if (photoIds !== undefined) {
    const problem = checkPhotoIds(photoIds, userId, row.id);
    if (problem) return fail(res, problem, 'PHOTO_NOT_FOUND', 422);
  }

  const updated = journal.updateEntry({
    id: row.id,
    type: type ?? row.type,
    emotion: emotion ?? row.emotion,
    title: title === undefined ? row.title : title.trim(),
    body: body === undefined ? row.body : body.trim(),
    updatedAt: now(),
  });
  if (photoIds !== undefined) deleteFiles(journal.setPhotos(row.id, photoIds));
  return ok(res, { entry: presentOne(updated, userId, { isOwner: true }) });
}

// DELETE /journal/:id
function deleteEntry(req, res) {
  const row = journal.getEntry(req.params.id);
  if (!row || row.user_id !== req.user.id) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);
  deleteFiles(journal.removeEntry(row.id));
  return ok(res, { message: 'Entry deleted' });
}

// PUT /journal/:id/shares   { recipientIds, message?, includePhotos? }  (the entry ends up shared with exactly these people)
function setShares(req, res) {
  const userId = req.user.id;
  const row = journal.getEntry(req.params.id);
  if (!row || row.user_id !== userId) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);

  const { recipientIds, message = '', includePhotos = true } = req.body;
  const allowed = sharedGroupPeople(userId);
  if (new Set(recipientIds).size !== recipientIds.length || recipientIds.some((id) => !allowed.has(id))) {
    return fail(res, 'You can only share with people who are in a group with you', 'NOT_IN_SHARED_GROUP', 403);
  }

  journal.setShares(row.id, recipientIds, { message: message.trim(), includePhotos, createdAt: now() });
  return ok(res, { sharedWith: journal.sharesOf(row.id).map((s) => person(s.recipient_id)) });
}

const lovesOf = (entryId, userId) => journal.loveInfo([entryId], userId).get(entryId) ?? { count: 0, mine: false };

// PUT /journal/:id/love and DELETE /journal/:id/love  (the person's own love; both are safe to repeat)
function setLove(on) {
  return (req, res) => {
    const userId = req.user.id;
    const row = journal.getEntry(req.params.id);
    if (!accessTo(row, userId)) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);
    if (on) journal.addLove(row.id, userId, now());
    else journal.removeLove(row.id, userId);
    return ok(res, { loves: lovesOf(row.id, userId) });
  };
}

// POST /journal/:id/replies   { body }
function addReply(req, res) {
  const userId = req.user.id;
  const row = journal.getEntry(req.params.id);
  if (!accessTo(row, userId)) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);

  const reply = { id: crypto.randomUUID(), entryId: row.id, userId, body: req.body.body.trim(), createdAt: now() };
  journal.addReply(reply);
  return ok(
    res,
    { reply: { id: reply.id, body: reply.body, createdAt: reply.createdAt, author: person(userId), isMine: true } },
    201
  );
}

// DELETE /journal/:id/replies/:replyId   (the author, or the owner of the entry)
function deleteReply(req, res) {
  const userId = req.user.id;
  const row = journal.getEntry(req.params.id);
  if (!accessTo(row, userId)) return fail(res, 'Entry not found', 'JOURNAL_NOT_FOUND', 404);
  const reply = journal.getReply(req.params.replyId, row.id);
  if (!reply) return fail(res, 'Reply not found', 'REPLY_NOT_FOUND', 404);
  if (reply.user_id !== userId && row.user_id !== userId) {
    return fail(res, 'Only the author or the owner of the entry can delete a reply', 'FORBIDDEN', 403);
  }
  journal.removeReply(reply.id);
  return ok(res, { message: 'Reply deleted' });
}

module.exports = {
  MAX_PHOTOS,
  uploadPhoto,
  getPhotoFile,
  createEntry,
  listEntries,
  listPeople,
  getEntry,
  updateEntry,
  deleteEntry,
  setShares,
  setLove,
  addReply,
  deleteReply,
};
