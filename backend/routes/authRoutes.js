const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { register, login, me, updateMe } = require('../controllers/authController');

const email = body('email').trim().toLowerCase().isEmail().withMessage('A valid email is required');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
    email,
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['student', 'teacher']).withMessage('Role must be student or teacher'),
  ],
  validate,
  register
);
router.post('/login', [email, body('password').notEmpty().withMessage('Password is required')], validate, login);
router.get('/me', protect, me);
router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  updateMe
);

module.exports = router;
