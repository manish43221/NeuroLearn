const router = require('express').Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { MAX_UPLOAD_BYTES } = require('../utils/assignment');
const a = require('../controllers/assignmentController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
});

const parseUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Files must be 10 MB or smaller'));
    if (error) return next(new ApiError(400, error.message || 'Invalid file upload'));
    next();
  });
};

const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Submission upload limit reached, please try again later' },
});

router.use(protect);

router.get('/', a.listAssignments);
router.post('/', authorize('teacher', 'admin'), a.createAssignment);
router.get('/:id', a.getAssignment);
router.put('/:id', authorize('teacher', 'admin'), a.updateAssignment);
router.delete('/:id', authorize('teacher', 'admin'), a.deleteAssignment);

router.get('/:id/submissions', authorize('teacher', 'admin'), a.listSubmissions);
router.get('/:id/submissions/me/file', authorize('student'), a.downloadOwnSubmission);
router.get('/:id/submissions/:submissionId/file', authorize('teacher', 'admin'), a.downloadSubmission);
router.post('/:id/submissions', authorize('student'), submissionLimiter, parseUpload, a.submitAssignment);
router.patch('/:id/submissions/:submissionId/evaluate', authorize('teacher', 'admin'), a.evaluateSubmission);

module.exports = router;
