const router = require('express').Router();
const { protect } = require('../middleware/auth');
const r = require('../controllers/resultController');

router.use(protect);

// fixed paths must come BEFORE "/:id"
router.get('/stats', r.getStats);
router.get('/weak-topics', r.getWeakTopics);
router.get('/leaderboard', r.getLeaderboard);
router.get('/', r.getHistory);
router.get('/:id', r.getResult);

module.exports = router;
