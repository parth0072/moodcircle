const { users } = require('../stores');
const { ok, fail } = require('../utils/response');

// GET /api/profile/me
function getProfile(req, res) {
  const user = users.get(req.user.id);
  return ok(res, { user: publicUser(user) });
}

// PATCH /api/profile
function updateProfile(req, res) {
  const { name, username, avatar } = req.body;
  const user = users.get(req.user.id);

  // Username uniqueness check (case-insensitive, skip self)
  if (username !== undefined) {
    const slug = username.toLowerCase();
    const taken = [...users.values()].find(
      (u) => u.id !== user.id && u.username === slug
    );
    if (taken) return fail(res, 'Username already taken', 'USERNAME_TAKEN', 409);
    user.username = slug;
  }

  if (name     !== undefined) user.name   = name.trim();
  if (avatar   !== undefined) user.avatar = avatar;

  users.set(user.id, user);
  return ok(res, { user: publicUser(user) });
}

function publicUser(u) {
  return {
    id:        u.id,
    phone:     u.phone,
    name:      u.name   || null,
    username:  u.username || null,
    avatar:    u.avatar || null,
    isPremium: u.isPremium,
  };
}

module.exports = { getProfile, updateProfile, publicUser };
