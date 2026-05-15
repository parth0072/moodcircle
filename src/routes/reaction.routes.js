const { Router } = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { addReaction, removeReaction } = require('../controllers/reaction.controller');

const ALLOWED_REACTIONS = ['sending_love', 'same', 'rooting_for_you', 'hang_in_there', 'so_happy_for_you'];

const router = Router({ mergeParams: true });

router.use(auth);

router.post(
  '/',
  [
    param('moodId').isUUID().withMessage('Invalid mood ID'),
    body('type').isIn(ALLOWED_REACTIONS).withMessage(`type must be one of: ${ALLOWED_REACTIONS.join(', ')}`),
  ],
  validate,
  addReaction
);

router.delete(
  '/:reactionId',
  [
    param('moodId').isUUID().withMessage('Invalid mood ID'),
    param('reactionId').isUUID().withMessage('Invalid reaction ID'),
  ],
  validate,
  removeReaction
);

module.exports = router;
