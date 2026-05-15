const crypto = require('crypto');
const { privatePairs, privateMoods, users } = require('../stores');
const { ok, fail } = require('../utils/response');
const { todayIST, daysAgoIST } = require('../utils/timezone');

// POST /private/pairs  — create a pair with another user
function createPair(req, res) {
  const { targetUserId } = req.body;
  const userId = req.user.id;

  if (userId === targetUserId) {
    return fail(res, 'You cannot create a pair with yourself', 'SELF_PAIR', 400);
  }

  const targetUser = users.get(targetUserId);
  if (!targetUser) return fail(res, 'Target user not found', 'USER_NOT_FOUND', 404);

  // Check pair already exists (either direction)
  const exists = [...privatePairs.values()].find(
    (p) =>
      (p.user1Id === userId && p.user2Id === targetUserId) ||
      (p.user1Id === targetUserId && p.user2Id === userId)
  );
  if (exists) return fail(res, 'A private pair already exists with this user', 'PAIR_EXISTS', 409);

  const id = crypto.randomUUID();
  const pair = { id, user1Id: userId, user2Id: targetUserId, createdAt: new Date().toISOString() };
  privatePairs.set(id, pair);

  return ok(res, { pair }, 201);
}

// POST /private/pairs/:pairId/moods  — post mood to a private pair
function postPrivateMood(req, res) {
  const { pairId } = req.params;
  const { level, note = '' } = req.body;
  const userId = req.user.id;

  const pair = privatePairs.get(pairId);
  if (!pair) return fail(res, 'Pair not found', 'PAIR_NOT_FOUND', 404);
  if (pair.user1Id !== userId && pair.user2Id !== userId) {
    return fail(res, 'You are not part of this pair', 'NOT_PAIR_MEMBER', 403);
  }

  const today = todayIST();
  const existing = [...privateMoods.values()].find(
    (m) => m.pairId === pairId && m.userId === userId && m.date === today
  );
  if (existing) {
    return fail(res, 'You have already posted a private mood today', 'ALREADY_POSTED', 409);
  }

  const id = crypto.randomUUID();
  const mood = {
    id,
    pairId,
    userId,
    level,
    note: note.trim(),
    date: today,
    createdAt: new Date().toISOString(),
  };
  privateMoods.set(id, mood);

  return ok(res, { mood }, 201);
}

// GET /private/pairs/:pairId/moods  — view private pair feed
function getPrivateFeed(req, res) {
  const { pairId } = req.params;
  const userId = req.user.id;

  const pair = privatePairs.get(pairId);
  if (!pair) return fail(res, 'Pair not found', 'PAIR_NOT_FOUND', 404);
  if (pair.user1Id !== userId && pair.user2Id !== userId) {
    return fail(res, 'You are not part of this pair', 'NOT_PAIR_MEMBER', 403);
  }

  const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
  const partner = users.get(partnerId);

  const feed = [...privateMoods.values()]
    .filter((m) => m.pairId === pairId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => ({
      id: m.id,
      isOwn: m.userId === userId,
      level: m.level,
      note: m.note,
      date: m.date,
      createdAt: m.createdAt,
    }));

  return ok(res, {
    pair: { id: pair.id, partner: { id: partnerId, phone: partner?.phone } },
    feed,
  });
}

module.exports = { createPair, postPrivateMood, getPrivateFeed };
