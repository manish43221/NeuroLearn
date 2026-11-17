const router = require('express').Router();
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const flashcards = require('../controllers/flashcardController');

const cardId = param('id').isMongoId().withMessage('Invalid flashcard id');
const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI request limit reached, try again later' },
});

router.use(protect);

router.get('/stats', flashcards.stats);
router.get('/', flashcards.list);
router.post(
  '/generate',
  generationLimiter,
  [
    body('courseId').isMongoId().withMessage('Choose a valid course'),
    body('topic').optional().isString().isLength({ max: 80 }),
    body('difficulty').isIn(['easy', 'medium', 'hard']),
    body('count').isInt({ min: 5, max: 20 }).custom((value) => [5, 10, 15, 20].includes(Number(value))),
  ],
  validate,
  flashcards.generate
);
router.post(
  '/',
  [
    body('courseId').isMongoId().withMessage('Choose a valid course'),
    body('front').isString().trim().notEmpty().isLength({ max: 500 }),
    body('back').isString().trim().notEmpty().isLength({ max: 2000 }),
    body('topic').optional().isString().isLength({ max: 80 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  ],
  validate,
  flashcards.create
);
router.post(
  '/:id/reviews',
  [cardId, body('rating').isIn(['known', 'difficult', 'forgotten'])],
  validate,
  flashcards.review
);
router.patch(
  '/:id',
  [
    cardId,
    body('front').optional().isString().trim().notEmpty().isLength({ max: 500 }),
    body('back').optional().isString().trim().notEmpty().isLength({ max: 2000 }),
    body('topic').optional().isString().trim().notEmpty().isLength({ max: 80 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  ],
  validate,
  flashcards.update
);
router.delete('/:id', cardId, validate, flashcards.remove);

module.exports = router;
