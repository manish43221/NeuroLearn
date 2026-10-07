const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const q = require('../controllers/quizController');

// AI calls cost money: limit generation per user/IP
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quiz generation limit reached, please try again later' },
});

router.use(protect);

router.post('/generate', generateLimiter, q.generate);
router.get('/', q.listQuizzes);
router.get('/:id', q.getQuiz);
router.post('/:id/submit', q.submit);
router.delete('/:id', q.deleteQuiz);

module.exports = router;
