const { fail } = require('../utils/response');

function premiumMiddleware(req, res, next) {
  if (!req.user.isPremium) {
    return fail(res, 'This feature requires a premium subscription', 'PREMIUM_REQUIRED', 403);
  }
  next();
}

module.exports = premiumMiddleware;
