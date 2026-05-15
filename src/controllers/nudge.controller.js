const crypto = require('crypto');
const { nudges, groups, users } = require('../stores');
const { ok, fail } = require('../utils/response');
const { todayIST } = require('../utils/timezone');

// POST /groups/:groupId/nudge
function sendNudge(req, res) {
  const { groupId } = req.params;
  const { targetUserId } = req.body;
  const fromUserId = req.user.id;

  if (fromUserId === targetUserId) {
    return fail(res, 'You cannot nudge yourself', 'SELF_NUDGE', 400);
  }

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(fromUserId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }
  if (!group.members.includes(targetUserId)) {
    return fail(res, 'Target user is not in this group', 'TARGET_NOT_MEMBER', 404);
  }

  const today = todayIST();

  // Max 1 nudge per sender→recipient per day
  const alreadyNudged = [...nudges.values()].find(
    (n) => n.fromUserId === fromUserId && n.toUserId === targetUserId && n.date === today
  );
  if (alreadyNudged) {
    return fail(res, 'You have already nudged this person today', 'NUDGE_LIMIT', 429);
  }

  const id = crypto.randomUUID();
  const nudge = {
    id,
    fromUserId,
    toUserId: targetUserId,
    groupId,
    date: today,
    createdAt: new Date().toISOString(),
  };

  nudges.set(id, nudge);
  return ok(res, { nudge }, 201);
}

module.exports = { sendNudge };
