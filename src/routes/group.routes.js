const { Router } = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { listMyGroups, createGroup, joinGroup, leaveGroup, getGroup } = require('../controllers/group.controller');

const router = Router();

router.use(auth);

router.get('/', listMyGroups);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Group name is required').isLength({ max: 60 }).withMessage('Name too long')],
  validate,
  createGroup
);

router.post(
  '/join',
  [body('inviteCode').trim().notEmpty().withMessage('Invite code is required')],
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
