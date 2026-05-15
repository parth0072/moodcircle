const jwt = require('jsonwebtoken');
const { users } = require('../stores');
const { fail } = require('../utils/response');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Missing or invalid Authorization header', 'UNAUTHORIZED', 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = users.get(payload.userId);
    if (!user) {
      return fail(res, 'User not found', 'UNAUTHORIZED', 401);
    }
    req.user = user;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 'UNAUTHORIZED', 401);
  }
}

module.exports = authMiddleware;
