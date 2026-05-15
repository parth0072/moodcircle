const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { users, otps } = require('../stores');
const { generateOTP, sendOTP } = require('../utils/otp');
const { ok, fail } = require('../utils/response');

function userPayload(u) {
  return {
    id:        u.id,
    email:     u.email,
    name:      u.name     || null,
    username:  u.username || null,
    avatar:    u.avatar   || null,
    isPremium: u.isPremium,
  };
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
    user = { id, email, isPremium: false, name: null, username: null, avatar: null, createdAt: new Date().toISOString() };
    users.set(id, user);
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  return ok(res, { token, user: userPayload(user) });
}

module.exports = { requestOTP, verifyOTP };
