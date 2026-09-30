const crypto = require('crypto');
const { groups, moods, users } = require('../stores');
const { ok, fail } = require('../utils/response');
const { todayIST } = require('../utils/timezone');
const { emotionOf } = require('../utils/group-moods');
const { syncAutoShare } = require('../utils/auto-share');

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
}

function findByInviteCode(code) {
  const wanted = String(code).trim().toUpperCase();
  return [...groups.values()].find((g) => g.inviteCode === wanted);
}

// GET /groups  — list all groups the current user belongs to
function listMyGroups(req, res) {
  const userId = req.user.id;
  const userGroups = [...groups.values()]
    .filter((g) => g.members.includes(userId))
    .map((g) => sanitize(g, userId));
  return ok(res, { groups: userGroups });
}

// GET /groups/overview  — the groups list with who is in each and what was posted today (one call
// for the app's "Your circles" screen instead of two per group)
function groupOverview(req, res) {
  const userId = req.user.id;
  const today = todayIST();
  const mine = [...groups.values()].filter((g) => g.members.includes(userId));
  const postedToday = [...moods.values()].filter((m) => m.date === today);

  return ok(res, {
    groups: mine.map((g) => ({
      ...sanitize(g, userId),
      members: g.members
        .map((id) => users.get(id))
        .filter(Boolean)
        .map((u) => ({ id: u.id, name: u.name || null, username: u.username || null })),
      today: postedToday
        .filter((m) => m.groupId === g.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((m) => ({
          userId: m.isAnonymous ? null : m.userId,
          emotion: emotionOf(m),
          createdAt: m.createdAt,
        })),
    })),
  });
}

// GET /groups/preview?code=  — what a code opens, before joining (the "Group found" card)
function previewGroup(req, res) {
  const group = findByInviteCode(req.query.code);
  if (!group) return fail(res, 'Invalid invite code', 'INVALID_INVITE_CODE', 404);

  const creator = users.get(group.createdBy);
  return ok(res, {
    group: {
      name: group.name,
      color: group.color || 'blue',
      showNotes: group.showNotes !== false,
      createdByName: creator?.name || creator?.username || null,
      memberCount: group.members.length,
      isMember: group.members.includes(req.user.id),
    },
  });
}

// POST /groups
function createGroup(req, res) {
  const { name, color = 'blue', showNotes = true } = req.body;
  const userId = req.user.id;

  const id = crypto.randomUUID();
  const inviteCode = generateInviteCode();

  const group = {
    id,
    name: name.trim(),
    inviteCode,
    createdBy: userId,
    members: [userId],
    color,
    showNotes,
    autoShare: {}, // userId -> true for members who share their journal's daily mood here
    createdAt: new Date().toISOString(),
  };

  groups.set(id, group);
  return ok(res, { group: sanitize(group, userId) }, 201);
}

// POST /groups/join
function joinGroup(req, res) {
  const { inviteCode, autoShare = false } = req.body;
  const userId = req.user.id;

  const group = findByInviteCode(inviteCode);

  if (!group) return fail(res, 'Invalid invite code', 'INVALID_INVITE_CODE', 404);
  if (group.members.includes(userId)) {
    return fail(res, 'You are already a member of this group', 'ALREADY_MEMBER', 409);
  }

  group.members.push(userId);
  if (autoShare) group.autoShare = { ...group.autoShare, [userId]: true };
  groups.set(group.id, group);
  if (autoShare) syncAutoShare(userId);
  return ok(res, { group: sanitize(group, userId) });
}

// DELETE /groups/:groupId/leave
function leaveGroup(req, res) {
  const { groupId } = req.params;
  const userId = req.user.id;

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  group.members = group.members.filter((id) => id !== userId);
  if (group.autoShare) delete group.autoShare[userId];

  // If last member leaves, delete the group
  if (group.members.length === 0) groups.delete(groupId);
  else groups.set(groupId, group);

  return ok(res, { message: 'Left group successfully' });
}

// GET /groups/:groupId
function getGroup(req, res) {
  const { groupId } = req.params;
  const userId = req.user.id;

  const group = groups.get(groupId);
  if (!group) return fail(res, 'Group not found', 'GROUP_NOT_FOUND', 404);
  if (!group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  const memberDetails = group.members.map((id) => {
    const u = users.get(id);
    return u ? { id: u.id, phone: u.phone, name: u.name || null, username: u.username || null, avatar: u.avatar || null } : null;
  }).filter(Boolean);

  return ok(res, { group: sanitize(group, userId), members: memberDetails });
}

// Helper: strip internal fields before sending
function sanitize(group, requesterId) {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    createdBy: group.createdBy,
    memberCount: group.members.length,
    isAdmin: group.createdBy === requesterId,
    color: group.color || 'blue',
    showNotes: group.showNotes !== false, // groups made before this setting show notes
    autoShare: !!(group.autoShare && group.autoShare[requesterId]),
    createdAt: group.createdAt,
  };
}

module.exports = { listMyGroups, groupOverview, previewGroup, createGroup, joinGroup, leaveGroup, getGroup };
