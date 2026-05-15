const { Router } = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { sendNudge } = require('../controllers/nudge.controller');

const router = Router({ mergeParams: true });

router.use(auth);

router.post(
  '/',
  [
    param('groupId').isUUID().withMessage('Invalid group ID'),
    body('targetUserId').isUUID().withMessage('targetUserId must be a valid UUID'),
  ],
  validate,
  sendNudge
);

module.exports = router;
