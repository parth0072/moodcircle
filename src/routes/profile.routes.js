const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

const router = Router();
router.use(auth);

router.get('/me', getProfile);

router.patch(
  '/',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be blank')
      .isLength({ max: 40 }).withMessage('Name too long'),
    body('username').optional().trim()
      .matches(/^[a-zA-Z0-9_]{3,20}$/)
      .withMessage('Username: 3–20 chars, letters/numbers/underscore only'),
    body('avatar').optional().isString(),
  ],
  validate,
  updateProfile
);

module.exports = router;
