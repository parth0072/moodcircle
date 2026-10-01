const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const photos = require('../utils/journal-photos');
const { fail } = require('../utils/response');
const c = require('../controllers/journal.controller');

const EMOTIONS = ['joy', 'calm', 'sad', 'worry', 'anger', 'meh'];
const TYPES = ['note', 'memory'];

const router = express.Router();

const entryId = param('id').isUUID().withMessage('Invalid entry ID');

// A photo link carries its own signature, so this is the one route without the login header.
router.get('/photos/:id/file', [param('id').isUUID().withMessage('Invalid photo ID')], validate, c.getPhotoFile);

router.use(auth);

// The fields of an entry: required on create, optional on update.
const fields = (optional) => {
  const wrap = (chain) => (optional ? chain.optional() : chain);
  return [
    wrap(body('type')).isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(', ')}`),
    wrap(body('emotion')).isIn(EMOTIONS).withMessage(`Emotion must be one of: ${EMOTIONS.join(', ')}`),
    wrap(body('title')).isString().trim().isLength({ min: 1, max: 80 }).withMessage('Title must be 1–80 characters'),
    body('body').optional().isString().isLength({ max: 5000 }).withMessage('Text can be at most 5000 characters'),
    body('photoIds').optional().isArray({ max: c.MAX_PHOTOS }).withMessage(`An entry can have up to ${c.MAX_PHOTOS} photos`),
    body('photoIds.*').isUUID().withMessage('Invalid photo ID'),
  ];
};

// The photo itself is the request body (the app has no use for multipart): only image types are read.
const rawImage = express.raw({ type: Object.keys(photos.TYPES), limit: photos.MAX_BYTES });
const sizeText = photos.MAX_BYTES >= 1048576 ? `${Math.round(photos.MAX_BYTES / 1048576)} MB` : `${Math.round(photos.MAX_BYTES / 1024)} KB`;

router.post(
  '/photos',
  rawImage,
  [
    query('width').optional().isInt({ min: 1, max: 20000 }).withMessage('Invalid width').toInt(),
    query('height').optional().isInt({ min: 1, max: 20000 }).withMessage('Invalid height').toInt(),
  ],
  validate,
  c.uploadPhoto
);

router.get('/people', c.listPeople);

router.post('/', fields(false), validate, c.createEntry);

router.get(
  '/',
  [
    query('type').optional().isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(', ')}`),
    query('q').optional().isString().isLength({ max: 100 }).withMessage('Search text can be at most 100 characters'),
    query('before').optional().isISO8601().withMessage('before must be a date and time'),
    query('limit').default(30).isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50').toInt(),
  ],
  validate,
  c.listEntries
);

router.get('/:id', [entryId], validate, c.getEntry);
router.patch('/:id', [entryId, ...fields(true)], validate, c.updateEntry);
router.delete('/:id', [entryId], validate, c.deleteEntry);

router.put(
  '/:id/shares',
  [
    entryId,
    body('recipientIds').isArray({ max: 20 }).withMessage('recipientIds must be a list of up to 20 people'),
    body('recipientIds.*').isUUID().withMessage('Invalid person ID'),
    body('message').optional().isString().isLength({ max: 200 }).withMessage('The message can be at most 200 characters'),
    body('includePhotos').optional().isBoolean().withMessage('includePhotos must be true or false').toBoolean(),
  ],
  validate,
  c.setShares
);

router.put('/:id/love', [entryId], validate, c.setLove(true));
router.delete('/:id/love', [entryId], validate, c.setLove(false));

router.post(
  '/:id/replies',
  [entryId, body('body').isString().trim().isLength({ min: 1, max: 500 }).withMessage('A reply must be 1–500 characters')],
  validate,
  c.addReply
);
router.delete('/:id/replies/:replyId', [entryId, param('replyId').isUUID().withMessage('Invalid reply ID')], validate, c.deleteReply);

// body-parser stops a too-big photo with its own error: answer it like every other failure.
router.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return fail(res, `Photos can be at most ${sizeText}`, 'PHOTO_TOO_LARGE', 413);
  }
  return next(err);
});

module.exports = router;
