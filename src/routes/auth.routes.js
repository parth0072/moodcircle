const { Router } = require('express');
const { body } = require('express-validator');
const validate       = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { requestOTP, verifyOTP, passwordLogin, setPassword } = require('../controllers/auth.controller');

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

router.post(
  '/password/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
  ],
  validate,
  passwordLogin
);

router.post(
  '/password/set',
  authMiddleware,
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  validate,
  setPassword
);

module.exports = router;
