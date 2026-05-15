const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { users, otps } = require('../stores');
const { generateOTP, sendOTP } = require('../utils/otp');
const { ok, fail } = require('../utils/response');

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function userPayload(u) {
  return {
    id:          u.id,
    email:       u.email,
    name:        u.name      || null,
    username:    u.username  || null,
    avatar:      u.avatar    || null,
    isPremium:   u.isPremium,
    hasPassword: !!u.passwordHash,
  };
}

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /auth/otp/request
async function requestOTP(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return fail(res, 'Email is required', 'MISSING_EMAIL', 400);

  const otp = generateOTP();
  const expiresAt = Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000;
  otps.set(email, { otp, expiresAt });

  await sendOTP(email, otp);

  const devPayload = process.env.NODE_ENV !== 'production' ? { otp } : {};
  return ok(res, { message: 'OTP sent', ...devPayload });
}

// POST /auth/otp/verify
async function verifyOTP(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const { otp } = req.body;
  if (!email) return fail(res, 'Email is required', 'MISSING_EMAIL', 400);

  const record = otps.get(email);
  if (!record) return fail(res, 'No OTP requested for this email', 'OTP_NOT_FOUND', 400);
  if (Date.now() > record.expiresAt) {
    otps.delete(email);
    return fail(res, 'OTP has expired', 'OTP_EXPIRED', 400);
  }
  if (record.otp !== otp) return fail(res, 'Invalid OTP', 'OTP_INVALID', 400);

  otps.delete(email);

  let user = [...users.values()].find((u) => u.email === email);
  if (!user) {
    const id = crypto.randomUUID();
    user = { id, email, isPremium: false, name: null, username: null, avatar: null, passwordHash: null, passwordSalt: null, createdAt: new Date().toISOString() };
    users.set(id, user);
  }

  return ok(res, { token: makeToken(user.id), user: userPayload(user) });
}

// POST /auth/password/login
async function passwordLogin(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  const user = [...users.values()].find((u) => u.email === email);
  if (!user || !user.passwordHash) {
    return fail(res, 'Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  const hash = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return fail(res, 'Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  return ok(res, { token: makeToken(user.id), user: userPayload(user) });
}

// POST /auth/password/set  (requires auth)
async function setPassword(req, res) {
  const { password } = req.body;
  const user = users.get(req.user.id);
  if (!user) return fail(res, 'User not found', 'NOT_FOUND', 404);

  const salt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = hashPassword(password, salt);
  user.passwordSalt = salt;
  users.set(user.id, user);

  return ok(res, { message: 'Password set', hasPassword: true });
}

module.exports = { requestOTP, verifyOTP, passwordLogin, setPassword };
