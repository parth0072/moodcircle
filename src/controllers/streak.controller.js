const { ok } = require('../utils/response');
const { getStreak } = require('../utils/streak');

// GET /streaks/me
function getMyStreak(req, res) {
  const streak = getStreak(req.user.id);
  return ok(res, { streak });
}

module.exports = { getMyStreak };
