const { Router } = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { isValidDate } = require('../utils/dates');
const {
  createEntry,
  listEntries,
  updateEntry,
  deleteEntry,
  getStats,
} = require('../controllers/entry.controller');

const EMOTIONS = ['joy', 'calm', 'sad', 'worry', 'anger', 'meh'];

const router = Router();
router.use(auth);

// The fields an entry can carry, required on create and optional on update.
const fields = (optional) => {
  const wrap = (chain) => (optional ? chain.optional() : chain);
  return [
    wrap(body('emotion')).isIn(EMOTIONS).withMessage(`Emotion must be one of: ${EMOTIONS.join(', ')}`),
    wrap(body('intensity')).isInt({ min: 1, max: 5 }).withMessage('Intensity must be 1–5').toInt(),
    body('tags').optional().isArray({ max: 8 }).withMessage('Up to 8 tags allowed'),
    body('tags.*').isString().trim().isLength({ min: 1, max: 20 }).withMessage('Each tag must be 1–20 characters'),
    body('note').optional().isString().isLength({ max: 500 }).withMessage('Note max 500 chars'),
  ];
};

const validDate = (chain, name) => chain.custom(isValidDate).withMessage(`${name} must be a date like 2026-09-30`);

router.post(
  '/',
  [...fields(false), validDate(body('date').optional(), 'date')],
  validate,
  createEntry
);

router.get(
  '/',
  [validDate(query('from'), 'from'), validDate(query('to'), 'to')],
  validate,
  listEntries
);

router.get('/stats', [validDate(query('date'), 'date')], validate, getStats);

router.patch(
  '/:id',
  [param('id').isUUID().withMessage('Invalid entry ID'), ...fields(true)],
  validate,
  updateEntry
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid entry ID')],
  validate,
  deleteEntry
);

module.exports = router;
