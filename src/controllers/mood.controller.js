const crypto = require('crypto');
const { moods, groups, users, reactions } = require('../stores');
const { ok, fail } = require('../utils/response');
const { todayIST, daysAgoIST } = require('../utils/timezone');
const { updateStreak } = require('../utils/streak');
const { levelFor, emotionOf } = require('../utils/group-moods');

// POST /groups/:groupId/moods
// The post is an `emotion` (the Moodbloom app) or a `level` 1-5 (the website). Every post keeps a
// level for the vibe score; with an emotion the level is worked out from it.
function postMood(req, res) {
  const { groupId } = req.params;
  const { level, emotion, note = '', privateNote = '', isAnonymous = false } = req.body;
  const userId = req.user.id;

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  const today = todayIST();
  const postLevel = emotion ? levelFor(emotion) : level;

  // One mood per user per group per day (IST)
  const existing = [...moods.values()].find(
    (m) => m.userId === userId && m.groupId === groupId && m.date === today
  );
  if (existing && existing.source !== 'auto') {
    return fail(res, 'You have already checked in today for this group', 'ALREADY_CHECKED_IN', 409);
  }

  // A post shared automatically from the journal can be replaced by the person's own post (to add
  // a few words): it then stays as they wrote it.
  if (existing) {
    const own = {
      ...existing,
      level: postLevel,
      emotion: emotion || null,
      note: note.trim(),
      privateNote: privateNote.trim(),
      isAnonymous,
      source: 'manual',
    };
    moods.set(own.id, own);
    return ok(res, { mood: toFeedItem(own, userId, group) });
  }

  const id = crypto.randomUUID();
  const mood = {
    id,
    userId,
    groupId,
    level: postLevel,
    emotion: emotion || null,
    note: note.trim(),
    privateNote: privateNote.trim(), // never exposed in feed
    isAnonymous,
    source: 'manual',
    date: today,
    createdAt: new Date().toISOString(),
  };

  moods.set(id, mood);
  updateStreak(userId);

  return ok(res, { mood: toFeedItem(mood, userId, group) }, 201);
}

// GET /groups/:groupId/moods/today
function getTodayFeed(req, res) {
  const { groupId } = req.params;
  const userId = req.user.id;

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  const today = todayIST();
  const todayMoods = [...moods.values()].filter(
    (m) => m.groupId === groupId && m.date === today
  );

  const checkedIn = todayMoods.length;
  const totalMembers = group.members.length;
  const vibeScore =
    checkedIn > 0
      ? parseFloat(
          (todayMoods.reduce((sum, m) => sum + m.level, 0) / checkedIn).toFixed(1)
        )
      : null;

  return ok(res, {
    feed: todayMoods.map((m) => toFeedItem(m, userId, group)),
    vibeScore,
    checkedIn,
    totalMembers,
  });
}

// GET /groups/:groupId/moods/history?days=7
function getMoodHistory(req, res) {
  const { groupId } = req.params;
  const userId = req.user.id;
  const days = parseInt(req.query.days) || 7;

  if (![7, 30, 90].includes(days)) {
    return fail(res, 'days must be 7, 30, or 90', 'INVALID_DAYS', 422);
  }

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  const cutoff = daysAgoIST(days);

  const history = [...moods.values()]
    .filter((m) => m.groupId === groupId && m.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => toFeedItem(m, userId, group));

  return ok(res, { history, days });
}

// ── Helper ────────────────────────────────────────────
function toFeedItem(mood, requesterId, group) {
  const isOwn = mood.userId === requesterId;
  const poster = !mood.isAnonymous ? users.get(mood.userId) : null;

  const moodReactions = [...reactions.values()]
    .filter((r) => r.moodId === mood.id)
    .map((r) => ({ id: r.id, type: r.type, userId: r.userId, createdAt: r.createdAt }));

  // A group set to "mood only" shows other people's moods without their words.
  const hideNote = group.showNotes === false && !isOwn;

  return {
    id: mood.id,
    user: mood.isAnonymous
      ? { anonymous: true }
      : { id: poster?.id, phone: poster?.phone, name: poster?.name || null, username: poster?.username || null, avatar: poster?.avatar || null },
    isOwn,
    level: mood.level,
    emotion: emotionOf(mood),
    note: hideNote ? '' : mood.note,
    // privateNote intentionally omitted
    isAnonymous: mood.isAnonymous,
    date: mood.date,
    createdAt: mood.createdAt,
    reactions: moodReactions,
  };
}

module.exports = { postMood, getTodayFeed, getMoodHistory };
