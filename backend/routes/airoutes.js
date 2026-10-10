const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const ai = require('../controllers/aiController');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false, message: { message: 'AI request limit reached, try again later' } });

router.use(protect, limiter);
router.post('/tutor', ai.tutor);
router.post('/study-plan', ai.studyPlan);
router.post('/flashcards', ai.flashcards);

module.exports = router;