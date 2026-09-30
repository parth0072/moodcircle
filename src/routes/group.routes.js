const { Router } = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { GROUP_COLORS } = require('../utils/group-moods');
const {
  listMyGroups,
  groupOverview,
  previewGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroup,
} = require('../controllers/group.controller');

const router = Router();

router.use(auth);

router.get('/', listMyGroups);

// Before '/:groupId', which would take these words for a group id.
router.get('/overview', groupOverview);

router.get(
  '/preview',
  [query('code').trim().notEmpty().withMessage('Invite code is required').isLength({ max: 40 }).withMessage('Invite code too long')],
  validate,
  previewGroup
);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Group name is required').isLength({ max: 60 }).withMessage('Name too long'),
    body('color').optional().isIn(GROUP_COLORS).withMessage(`color must be one of: ${GROUP_COLORS.join(', ')}`),
    body('showNotes').optional().isBoolean().withMessage('showNotes must be boolean').toBoolean(),
  ],
  validate,
  createGroup
);

router.post(
  '/join',
  [
    body('inviteCode').trim().notEmpty().withMessage('Invite code is required'),
    body('autoShare').optional().isBoolean().withMessage('autoShare must be boolean').toBoolean(),
  ],
  validate,
  joinGroup
);

router.delete(
  '/:groupId/leave',
  [param('groupId').isUUID().withMessage('Invalid group ID')],
  validate,
  leaveGroup
);

router.get(
  '/:groupId',
  [param('groupId').isUUID().withMessage('Invalid group ID')],
  validate,
  getGroup
);

module.exports = router;
