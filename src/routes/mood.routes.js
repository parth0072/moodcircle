const { Router } = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { EMOTIONS } = require('../utils/group-moods');
const { postMood, getTodayFeed, getMoodHistory } = require('../controllers/mood.controller');

const router = Router({ mergeParams: true }); // inherit :groupId from parent

router.use(auth);

router.post(
  '/',
  [
    param('groupId').isUUID().withMessage('Invalid group ID'),
    // A post is an emotion (the app) or a level 1-5 (the website); one of the two is needed.
    body('level').optional().isInt({ min: 1, max: 5 }).withMessage('Mood level must be 1–5').toInt(),
    body('emotion').optional().isIn(EMOTIONS).withMessage(`emotion must be one of: ${EMOTIONS.join(', ')}`),
    body().custom((value) => {
      if (value.level === undefined && value.emotion === undefined) {
        throw new Error('Choose an emotion or a mood level (1–5)');
      }
      return true;
    }),
    body('note').optional().isString().isLength({ max: 280 }).withMessage('Note max 280 chars'),
    body('privateNote').optional().isString().isLength({ max: 500 }).withMessage('Private note max 500 chars'),
    body('isAnonymous').optional().isBoolean().withMessage('isAnonymous must be boolean'),
  ],
  validate,
  postMood
);

router.get(
  '/today',
  [param('groupId').isUUID().withMessage('Invalid group ID')],
  validate,
  getTodayFeed
);

router.get(
  '/history',
  [
    param('groupId').isUUID().withMessage('Invalid group ID'),
    query('days').optional().isIn(['7', '30', '90']).withMessage('days must be 7, 30, or 90'),
  ],
  validate,
  getMoodHistory
);

module.exports = router;
