const Result = require('../models/Result');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { topicStats, streak, badges, WEAK } = require('../utils/analytics');

// GET /api/results   -> history (without the heavy answer snapshots)
exports.getHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const results = await Result.find({ user: req.user._id }).sort('-createdAt').limit(limit).select('-answers').populate('course', 'title');
  res.json(results);
});

// GET /api/results/:id
exports.getResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id).populate('course', 'title');
  if (!result) throw new ApiError(404, 'Result not found');
  if (String(result.user) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  res.json(result);
});

// GET /api/results/weak-topics?course=
exports.getWeakTopics = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.course) filter.course = req.query.course;
  const results = await Result.find(filter).sort('-createdAt').select('topicBreakdown course');
  res.json({ threshold: WEAK, topics: topicStats(results).filter((t) => t.level === 'weak') });
});

// GET /api/results/stats   -> everything the dashboard + performance page need
exports.getStats = asyncHandler(async (req, res) => {
  const results = await Result.find({ user: req.user._id }).sort('-createdAt').select('-answers').populate('course', 'title');
  const topics = topicStats(results);
  const weakTopics = topics.filter((t) => t.level === 'weak' && t.total >= 2);

  const quizzes = results.length;
  const avg = quizzes ? Math.round(results.reduce((s, r) => s + r.score, 0) / quizzes) : 0;
  const best = quizzes ? Math.max(...results.map((r) => r.score)) : 0;
  const streakDays = streak(results.map((r) => r.createdAt));

  // chronological score trend (last 10)
  const scoreTrend = [...results].slice(0, 10).reverse().map((r, i) => ({ label: `Quiz ${i + 1}`, score: r.score, date: r.createdAt }));

  // course-wise performance
  const byCourse = {};
  for (const r of results) {
    const key = r.course?._id ? String(r.course._id) : 'x';
    byCourse[key] = byCourse[key] || { course: r.course?.title || 'Deleted course', quizzes: 0, total: 0 };
    byCourse[key].quizzes++;
    byCourse[key].total += r.score;
  }
  const courseStats = Object.values(byCourse).map((c) => ({ course: c.course, quizzes: c.quizzes, average: Math.round(c.total / c.quizzes) }));

  // next-topic recommendation
  const weakest = weakTopics[0];
  const recommendation = weakest
    ? { topic: weakest.topic, accuracy: weakest.accuracy, courseId: weakest.course, message: `Your weakest topic is ${weakest.topic} (${weakest.accuracy}%). A short quiz can help.` }
    : quizzes
    ? { topic: null, courseId: results[0].course?._id, message: 'No weak topics right now. Keep practising to stay sharp!' }
    : null;

  res.json({
    enrolledCourses: req.user.enrollments.length,
    quizzesTaken: quizzes,
    averageScore: avg,
    bestScore: best,
    topicsToImprove: weakTopics.length,
    streak: streakDays,
    badges: badges({ quizzes, avg, best, streakDays }),
    scoreTrend,
    topics,
    weakTopics,
    courseStats,
    recommendation,
    recentResults: results.slice(0, 5),
  });
});

// GET /api/results/leaderboard
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const rows = await Result.aggregate([
    { $group: { _id: '$user', quizzes: { $sum: 1 }, average: { $avg: '$score' } } },
    { $match: { quizzes: { $gte: 1 } } },
    { $sort: { average: -1, quizzes: -1 } },
    { $limit: 10 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name');
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      name: names.get(String(r._id)) || 'Student',
      quizzes: r.quizzes,
      average: Math.round(r.average),
      isMe: String(r._id) === String(req.user._id),
    }))
  );
});
