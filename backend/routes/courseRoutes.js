const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/courseController');

const courseRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
];

router.use(protect);

router.get('/', c.getCourses);
router.get('/categories', c.getCategories);
router.get('/my', c.getMyCourses);
router.post('/', authorize('teacher', 'admin'), courseRules, validate, c.createCourse);

router.get('/:id', c.getCourse);
router.put('/:id', authorize('teacher', 'admin'), c.updateCourse);
router.delete('/:id', authorize('teacher', 'admin'), c.deleteCourse);

router.post('/:id/enroll', c.enroll);
router.delete('/:id/enroll', c.unenroll);
router.post('/:id/lessons/:lessonId/complete', c.setLessonComplete(true));
router.delete('/:id/lessons/:lessonId/complete', c.setLessonComplete(false));

module.exports = router;
