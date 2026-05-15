const crypto = require('crypto');
const { users } = require('../stores');
const { ok, fail } = require('../utils/response');

// POST /premium/verify  — verify Razorpay payment and unlock premium
function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.id;

  // Verify HMAC signature: sha256(order_id + "|" + payment_id) signed with key secret
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return fail(res, 'Payment verification failed — invalid signature', 'INVALID_SIGNATURE', 400);
  }

  const user = users.get(userId);
  user.isPremium = true;
  user.premiumSince = new Date().toISOString();

  return ok(res, { message: 'Premium unlocked', isPremium: true });
}

// GET /premium/status
function getPremiumStatus(req, res) {
  const user = users.get(req.user.id);
  return ok(res, { isPremium: user.isPremium, premiumSince: user.premiumSince || null });
}

module.exports = { verifyPayment, getPremiumStatus };
