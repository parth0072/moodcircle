const { Router } = require('express');
const auth = require('../middleware/auth.middleware');
const { getMyStreak } = require('../controllers/streak.controller');

const router = Router();

router.use(auth);
router.get('/me', getMyStreak);

module.exports = router;
