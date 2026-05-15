const { Router } = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const premium = require('../middleware/premium.middleware');
const validate = require('../middleware/validate.middleware');
const { createPair, postPrivateMood, getPrivateFeed } = require('../controllers/private.controller');

const router = Router();

// All private routes require auth + premium
router.use(auth, premium);

router.post(
  '/pairs',
  [body('targetUserId').isUUID().withMessage('targetUserId must be a valid UUID')],
  validate,
  createPair
);

router.post(
  '/pairs/:pairId/moods',
  [
    param('pairId').isUUID().withMessage('Invalid pair ID'),
    body('level').isInt({ min: 1, max: 5 }).withMessage('Mood level must be 1–5'),
    body('note').optional().isString().isLength({ max: 280 }).withMessage('Note max 280 chars'),
  ],
  validate,
  postPrivateMood
);

router.get(
  '/pairs/:pairId/moods',
  [param('pairId').isUUID().withMessage('Invalid pair ID')],
  validate,
  getPrivateFeed
);

module.exports = router;
