const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateQuiz } = require('../services/aiService');
const { topicStats, suggestDifficulty } = require('../utils/analytics');

// Students never receive the answers before submitting
const publicQuiz = (quiz) => ({
  _id: quiz._id,
  course: quiz.course,
  title: quiz.title,
  topic: quiz.topic,
  difficulty: quiz.difficulty,
  source: quiz.source,
  createdAt: quiz.createdAt,
  questions: quiz.questions.map((q) => ({ _id: q._id, question: q.question, options: q.options, topic: q.topic, difficulty: q.difficulty })),
});

const ownsQuiz = (user, quiz) => user.role === 'admin' || String(quiz.createdBy) === String(user._id);

// POST /api/quizzes/generate   { courseId, topic, difficulty, count }
// topic: "" (all topics) | "weak" (your weakest topic) | a topic name
// difficulty: easy | medium | hard | auto (adaptive)
exports.generate = asyncHandler(async (req, res) => {
  const { courseId, topic = '', difficulty = 'auto' } = req.body;
  const count = Math.min(Math.max(parseInt(req.body.count, 10) || 5, 3), 15);

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  const isStaff = req.user.role !== 'student';
  if (!isStaff && !req.user.enrollments.some((e) => String(e.course) === String(course._id))) {
    throw new ApiError(403, 'Enrol in this course to generate quizzes');
  }
  if (!course.topics.length) throw new ApiError(400, 'This course has no topics yet');

  // resolve topic
  let focusTopic = topic || null;
  if (topic === 'weak') {
    const results = await Result.find({ user: req.user._id, course: course._id }).sort('-createdAt').select('topicBreakdown course');
    const weakest = topicStats(results).find((t) => t.level === 'weak' && t.total >= 2);
    focusTopic = weakest ? weakest.topic : null;
  }
  if (focusTopic && !course.topics.some((t) => t.toLowerCase() === focusTopic.toLowerCase())) {
    throw new ApiError(400, `"${focusTopic}" is not a topic of this course`);
  }

  // resolve difficulty (adaptive when "auto")
  const level = difficulty === 'auto' ? await suggestDifficulty(req.user._id, course._id) : difficulty;
  if (!['easy', 'medium', 'hard'].includes(level)) throw new ApiError(400, 'Invalid difficulty');

  // course material that is sent to the AI as context
  const lessons = focusTopic ? course.lessons.filter((l) => (l.topic || '').toLowerCase() === focusTopic.toLowerCase()) : course.lessons;
  const material = lessons.map((l) => `${l.title}: ${l.content}`).join('\n').slice(0, 6000);

  const { questions, source, warning } = await generateQuiz({
    courseTitle: course.title,
    description: course.description,
    topics: course.topics,
    focusTopic,
    difficulty: level,
    count,
    material,
  });

  const quiz = await Quiz.create({
    course: course._id,
    title: `${course.title} — ${focusTopic || 'Mixed topics'} (${level})`,
    topic: focusTopic || 'All topics',
    difficulty: level,
    questions,
    source,
    createdBy: req.user._id,
  });
  res.status(201).json({ quiz: publicQuiz(quiz), warning: warning || null });
});

// GET /api/quizzes   -> quizzes created by me + attempt info
exports.listQuizzes = asyncHandler(async (req, res) => {
  const filter = { createdBy: req.user._id };
  if (req.query.course) filter.course = req.query.course;
  const quizzes = await Quiz.find(filter).sort('-createdAt').limit(60).populate('course', 'title').lean();
  const results = await Result.find({ user: req.user._id, quiz: { $in: quizzes.map((q) => q._id) } }).select('quiz score').lean();

  res.json(
    quizzes.map((q) => {
      const attempts = results.filter((r) => String(r.quiz) === String(q._id));
      return {
        _id: q._id,
        title: q.title,
        course: q.course,
        topic: q.topic,
        difficulty: q.difficulty,
        source: q.source,
        createdAt: q.createdAt,
        questionCount: q.questions.length,
        attempts: attempts.length,
        bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
      };
    })
  );
});

// GET /api/quizzes/:id
exports.getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  if (!ownsQuiz(req.user, quiz)) throw new ApiError(403, 'This quiz belongs to another user');
  res.json(publicQuiz(quiz));
});

// POST /api/quizzes/:id/submit   { answers: [{ questionId, selected }], timeTaken }
exports.submit = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  if (!ownsQuiz(req.user, quiz)) throw new ApiError(403, 'This quiz belongs to another user');

  const given = new Map((Array.isArray(req.body.answers) ? req.body.answers : []).map((a) => [String(a.questionId), a.selected]));
  const breakdown = new Map();
  let correct = 0;

  const answers = quiz.questions.map((q) => {
    const sel = given.get(String(q._id));
    const selected = Number.isInteger(sel) && sel >= 0 && sel <= 3 ? sel : -1;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) correct++;
    const t = breakdown.get(q.topic) || { topic: q.topic, correct: 0, total: 0 };
    t.total++;
    if (isCorrect) t.correct++;
    breakdown.set(q.topic, t);
    return { question: q.question, options: q.options, selected, correctAnswer: q.correctAnswer, explanation: q.explanation, topic: q.topic, isCorrect };
  });

  const total = quiz.questions.length;
  const result = await Result.create({
    user: req.user._id,
    quiz: quiz._id,
    course: quiz.course,
    quizTitle: quiz.title,
    difficulty: quiz.difficulty,
    score: Math.round((correct / total) * 100),
    correct,
    total,
    timeTaken: Math.max(0, parseInt(req.body.timeTaken, 10) || 0),
    topicBreakdown: [...breakdown.values()],
    answers,
  });
  res.status(201).json(result);
});

// DELETE /api/quizzes/:id
exports.deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  if (!ownsQuiz(req.user, quiz)) throw new ApiError(403, 'Not allowed');
  await quiz.deleteOne();
  res.json({ message: 'Quiz deleted' });
});
