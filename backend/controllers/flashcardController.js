const mongoose = require('mongoose');
const Course = require('../models/Course');
const Flashcard = require('../models/Flashcard');
const FlashcardReview = require('../models/FlashcardReview');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bank = require('../services/questionBank');
const { askAI } = require('../services/aiService');

const ratings = ['known', 'difficult', 'forgotten'];
const difficulties = ['easy', 'medium', 'hard'];

async function getAccessibleCourse(user, id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (
    user.role === 'student' &&
    !user.enrollments.some((enrollment) => String(enrollment.course) === String(course._id))
  ) {
    throw new ApiError(403, 'Enrol in this course first');
  }
  return course;
}

function parseCards(text) {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return [];
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  const list = Array.isArray(parsed) ? parsed : parsed.cards;
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .map((item) => ({
      front: String(item?.front || '').trim().slice(0, 500),
      back: String(item?.back || '').trim().slice(0, 2000),
      topic: String(item?.topic || '').trim().slice(0, 80),
    }))
    .filter((item) => {
      const key = item.front.toLowerCase();
      if (item.front.length < 4 || item.back.length < 4 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function offlineCards(course, topic) {
  const lessons = course.lessons
    .filter((lesson) => !topic || (lesson.topic || '').toLowerCase() === topic.toLowerCase())
    .filter((lesson) => lesson.title && lesson.content)
    .map((lesson) => ({
      front: `Explain: ${lesson.title}`,
      back: lesson.content.slice(0, 2000),
      topic: lesson.topic || topic || course.topics[0] || 'General',
    }));
  const wanted = (topic ? [topic] : course.topics).map((value) => value.toLowerCase());
  const questions = bank
    .filter((item) => wanted.includes(String(item.topic).toLowerCase()))
    .map((item) => ({
      front: item.question,
      back: `${item.options[item.correctAnswer]} — ${item.explanation}`,
      topic: item.topic,
    }));
  const seen = new Set();
  return [...lessons, ...questions]
    .filter((item) => {
      const key = item.front.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(() => Math.random() - 0.5);
}

async function generateCards(course, { topic, difficulty, count }) {
  const allowedTopics = topic ? [topic] : (course.topics.length ? course.topics : ['General']);
  const material = course.lessons
    .filter((lesson) => !topic || (lesson.topic || '').toLowerCase() === topic.toLowerCase())
    .map((lesson) => `${lesson.title}: ${lesson.content}`)
    .join('\n')
    .slice(0, 8000);
  let aiWarning = null;

  try {
    const response = await askAI(
      `Create exactly ${count} accurate, useful active-recall flashcards for this course.

COURSE: ${course.title}
DESCRIPTION: ${course.description}
ALLOWED TOPICS: ${JSON.stringify(allowedTopics)}
DIFFICULTY: ${difficulty}
COURSE MATERIAL:
${material || 'Use established subject knowledge, staying within the course and allowed topics.'}

Make each front a clear question or prompt and each back a concise, correct answer. Questions must be distinct, course-related, and appropriate to the requested difficulty. Every topic must exactly match an allowed topic.
Return only JSON: {"cards":[{"front":"question","back":"answer","topic":"topic label"}]}`,
      { json: true }
    );
    const cards = parseCards(response).filter((card) =>
      allowedTopics.some((allowed) => allowed.toLowerCase() === card.topic.toLowerCase())
    );
    if (cards.length >= count) return { cards: cards.slice(0, count), source: 'ai' };
    if (cards.length) aiWarning = `AI returned ${cards.length} valid cards; using course materials for the remainder.`;
    const fallback = offlineCards(course, topic);
    const existing = new Set(cards.map((card) => card.front.toLowerCase()));
    const combined = [...cards, ...fallback.filter((card) => !existing.has(card.front.toLowerCase()))];
    if (combined.length >= count) {
      return {
        cards: combined.slice(0, count),
        source: cards.length ? 'ai' : 'offline',
        warning: aiWarning,
      };
    }
  } catch (error) {
    console.error('Flashcard AI generation failed:', error.message);
    aiWarning = `AI generation failed: ${error.message}`;
  }

  const fallback = offlineCards(course, topic);
  if (fallback.length < count) {
    throw new ApiError(
      502,
      `${aiWarning ? `${aiWarning} ` : ''}Only ${fallback.length} unique offline cards are available. Add lesson content or configure the AI provider, or choose fewer cards.`
    );
  }
  return {
    cards: fallback.slice(0, count),
    source: 'offline',
    warning: aiWarning,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.course) {
    if (!mongoose.isValidObjectId(req.query.course)) throw new ApiError(400, 'Invalid course id');
    filter.course = req.query.course;
  }
  if (req.query.topic) filter.topic = String(req.query.topic).slice(0, 80);
  if (req.query.search) filter.front = new RegExp(String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.due === 'true') filter.nextReviewAt = { $lte: new Date() };

  const cards = await Flashcard.find(filter)
    .populate('course', 'title')
    .sort({ nextReviewAt: 1, createdAt: -1 })
    .limit(500)
    .lean();
  if (req.query.due === 'true') {
    const priority = { forgotten: 0, difficult: 1, undefined: 2, known: 3 };
    cards.sort((a, b) => (priority[a.lastRating] ?? 2) - (priority[b.lastRating] ?? 2) || a.nextReviewAt - b.nextReviewAt);
  }
  res.json(cards);
});

exports.generate = asyncHandler(async (req, res) => {
  const count = Number(req.body.count);
  const difficulty = String(req.body.difficulty || '').toLowerCase();
  const course = await getAccessibleCourse(req.user, req.body.courseId);
  const topic = String(req.body.topic || '').trim();
  if (![5, 10, 15, 20].includes(count)) throw new ApiError(400, 'Choose 5, 10, 15, or 20 cards');
  if (!difficulties.includes(difficulty)) throw new ApiError(400, 'Choose easy, medium, or hard difficulty');
  if (topic && !course.topics.some((item) => item.toLowerCase() === topic.toLowerCase())) {
    throw new ApiError(400, 'Unknown course topic');
  }

  const generated = await generateCards(course, { topic, difficulty, count });
  const cards = await Flashcard.insertMany(
    generated.cards.map((card) => ({
      user: req.user._id,
      course: course._id,
      topic: card.topic || topic || course.topics[0] || 'General',
      difficulty,
      source: generated.source,
      front: card.front,
      back: card.back,
    }))
  );
  res.status(201).json({
    cards,
    source: generated.source,
    warning: generated.warning || null,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const course = await getAccessibleCourse(req.user, req.body.courseId);
  const difficulty = String(req.body.difficulty || 'medium').toLowerCase();
  if (!difficulties.includes(difficulty)) throw new ApiError(400, 'Invalid difficulty');
  const card = await Flashcard.create({
    user: req.user._id,
    course: course._id,
    front: String(req.body.front || '').trim(),
    back: String(req.body.back || '').trim(),
    topic: String(req.body.topic || '').trim() || 'General',
    difficulty,
    source: 'custom',
  });
  res.status(201).json(card);
});

exports.update = asyncHandler(async (req, res) => {
  const card = await Flashcard.findOne({ _id: req.params.id, user: req.user._id });
  if (!card) throw new ApiError(404, 'Flashcard not found');
  for (const field of ['front', 'back', 'topic']) {
    if (req.body[field] !== undefined) card[field] = String(req.body[field]).trim();
  }
  if (req.body.difficulty !== undefined) {
    const difficulty = String(req.body.difficulty).toLowerCase();
    if (!difficulties.includes(difficulty)) throw new ApiError(400, 'Invalid difficulty');
    card.difficulty = difficulty;
  }
  await card.save();
  res.json(card);
});

exports.remove = asyncHandler(async (req, res) => {
  const card = await Flashcard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!card) throw new ApiError(404, 'Flashcard not found');
  await FlashcardReview.deleteMany({ flashcard: card._id, user: req.user._id });
  res.json({ message: 'Flashcard deleted' });
});

exports.review = asyncHandler(async (req, res) => {
  const rating = String(req.body.rating || '');
  if (!ratings.includes(rating)) throw new ApiError(400, 'Choose known, difficult, or forgotten');
  const card = await Flashcard.findOne({ _id: req.params.id, user: req.user._id });
  if (!card) throw new ApiError(404, 'Flashcard not found');

  let intervalDays;
  if (rating === 'forgotten') intervalDays = 1 / 144;
  else if (rating === 'difficult') intervalDays = card.intervalDays ? Math.max(1, Math.round(card.intervalDays * 1.5)) : 1;
  else intervalDays = card.intervalDays ? Math.min(180, Math.round(card.intervalDays * 2.5)) : 3;
  const reviewedAt = new Date();
  const nextReviewAt = new Date(reviewedAt.getTime() + intervalDays * 86400000);
  const review = await FlashcardReview.create({
    user: req.user._id,
    flashcard: card._id,
    rating,
    reviewedAt,
    nextReviewAt,
  });

  const updated = await Flashcard.findOneAndUpdate(
    { _id: card._id, user: req.user._id, reviewCount: card.reviewCount, intervalDays: card.intervalDays },
    { $set: { intervalDays, nextReviewAt, lastReviewedAt: reviewedAt, lastRating: rating }, $inc: { reviewCount: 1 } },
    { new: true }
  );
  if (!updated) {
    await FlashcardReview.deleteOne({ _id: review._id });
    throw new ApiError(409, 'This card was reviewed elsewhere. Refresh and try again.');
  }
  res.status(201).json({ card: updated, review });
});

exports.stats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(String(req.user._id));
  const [totalCards, reviewedCards, dueCards, ratingTotals, topics, days] = await Promise.all([
    Flashcard.countDocuments({ user: userId }),
    Flashcard.countDocuments({ user: userId, reviewCount: { $gt: 0 } }),
    Flashcard.countDocuments({ user: userId, nextReviewAt: { $lte: new Date() } }),
    FlashcardReview.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    FlashcardReview.aggregate([
      { $match: { user: userId } },
      { $lookup: { from: 'flashcards', localField: 'flashcard', foreignField: '_id', as: 'card' } },
      { $unwind: '$card' },
      {
        $group: {
          _id: '$card.topic',
          reviewed: { $sum: 1 },
          recalled: { $sum: { $cond: [{ $in: ['$rating', ['known', 'difficult']] }, 1, 0] } },
        },
      },
      { $sort: { reviewed: -1, _id: 1 } },
    ]),
    FlashcardReview.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt', timezone: 'UTC' } },
          reviews: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const ratingsByName = Object.fromEntries(ratingTotals.map((item) => [item._id, item.count]));
  const reviewed = Object.values(ratingsByName).reduce((sum, count) => sum + count, 0);
  const recalled = (ratingsByName.known || 0) + (ratingsByName.difficult || 0);
  const dates = days.map((item) => item._id);
  const dateSet = new Set(dates);
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  let cursor = dateSet.has(today) ? today : yesterdayDate.toISOString().slice(0, 10);
  let currentStreak = 0;
  while (dateSet.has(cursor)) {
    currentStreak++;
    const date = new Date(`${cursor}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    cursor = date.toISOString().slice(0, 10);
  }
  let longestStreak = 0;
  let run = 0;
  let previousDate = null;
  for (const dateString of dates) {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    const consecutive = previousDate && date.getTime() - previousDate.getTime() === 86400000;
    run = consecutive ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previousDate = date;
  }
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  const activityByDate = new Map(days.map((item) => [item._id, item.reviews]));
  const activity = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, reviews: activityByDate.get(key) || 0 };
  });

  res.json({
    totalCards,
    reviewedCards,
    dueCards,
    totalReviews: reviewed,
    known: ratingsByName.known || 0,
    difficult: ratingsByName.difficult || 0,
    forgotten: ratingsByName.forgotten || 0,
    recallRate: reviewed ? Math.round((recalled / reviewed) * 100) : 0,
    currentStreak,
    longestStreak,
    topics: topics.map((item) => ({
      topic: item._id,
      reviewed: item.reviewed,
      recalled: item.recalled,
      recallRate: Math.round((item.recalled / item.reviewed) * 100),
    })),
    activity,
  });
});
