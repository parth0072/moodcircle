const crypto = require('crypto');
const { groups, users } = require('../stores');
const { ok, fail } = require('../utils/response');

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
}

// GET /groups  — list all groups the current user belongs to
function listMyGroups(req, res) {
  const userId = req.user.id;
  const userGroups = [...groups.values()]
    .filter((g) => g.members.includes(userId))
    .map((g) => sanitize(g, userId));
  return ok(res, { groups: userGroups });
}

// POST /groups
function createGroup(req, res) {
  const { name } = req.body;
  const userId = req.user.id;

  const id = crypto.randomUUID();
  const inviteCode = generateInviteCode();

  const group = {
    id,
    name: name.trim(),
    inviteCode,
    createdBy: userId,
    members: [userId],
    createdAt: new Date().toISOString(),
  };

  groups.set(id, group);
  return ok(res, { group: sanitize(group, userId) }, 201);
}

// POST /groups/join
function joinGroup(req, res) {
  const { inviteCode } = req.body;
  const userId = req.user.id;

  const group = [...groups.values()].find(
    (g) => g.inviteCode === inviteCode.toUpperCase()
  );

  if (!group) return fail(res, 'Invalid invite code', 'INVALID_INVITE_CODE', 404);
  if (group.members.includes(userId)) {
    return fail(res, 'You are already a member of this group', 'ALREADY_MEMBER', 409);
  }

  group.members.push(userId);
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

  // If last member leaves, delete the group
  if (group.members.length === 0) groups.delete(groupId);

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
    createdAt: group.createdAt,
  };
}

module.exports = { listMyGroups, createGroup, joinGroup, leaveGroup, getGroup };
