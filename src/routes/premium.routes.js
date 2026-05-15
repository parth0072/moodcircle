const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { verifyPayment, getPremiumStatus } = require('../controllers/premium.controller');

const router = Router();

router.use(auth);

router.post(
  '/verify',
  [
    body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
    body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
    body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required'),
  ],
  validate,
  verifyPayment
);

router.get('/status', getPremiumStatus);

module.exports = router;
