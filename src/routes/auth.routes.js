const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const { requestOTP, verifyOTP } = require('../controllers/auth.controller');

const router = Router();

router.post(
  '/otp/request',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  requestOTP
);

router.post(
  '/otp/verify',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  validate,
  verifyOTP
);

module.exports = router;
