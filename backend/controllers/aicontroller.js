const Course = require('../models/Course');
const Result = require('../models/Result');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bank = require('../services/questionBank');
const { askAI } = require('../services/aiService');
const { topicStats } = require('../utils/analytics');

const clean = (t) => { try { return JSON.parse(String(t).replace(/```json|```/gi, '').trim()); } catch { return null; } };
const str = (v, max = 400) => String(v ?? '').trim().slice(0, max);

async function getCourse(user, id) {
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (user.role === 'student' && !user.enrollments.some((e) => String(e.course) === String(course._id))) throw new ApiError(403, 'Enrol in this course first');
  return course;
}
const weakTopics = async (userId, courseId) =>
  topicStats(await Result.find({ user: userId, course: courseId }).select('topicBreakdown course')).filter((t) => t.level === 'weak' && t.total >= 2);
const material = (course, topic) =>
  course.lessons.filter((l) => !topic || (l.topic || '').toLowerCase() === topic.toLowerCase()).map((l) => `${l.title}: ${l.content}`).join('\n').slice(0, 6000);

// POST /api/ai/tutor  { courseId, question }
exports.tutor = asyncHandler(async (req, res) => {
  const question = str(req.body.question, 500);
  if (question.length < 3) throw new ApiError(400, 'Please type a question');
  const course = await getCourse(req.user, req.body.courseId);
  const weak = await weakTopics(req.user._id, course._id);

  const prompt = `You are a friendly tutor for the course "${course.title}". Explain clearly in under 180 words with a short example. Use the course material when relevant.
Student's weak topics: ${weak.map((w) => w.topic).join(', ') || 'none yet'}.
Course material:\n${material(course)}\n\nStudent question: ${question}`;
  try {
    const answer = await askAI(prompt);
    if (answer) return res.json({ answer: answer.trim(), source: 'ai' });
  } catch (e) { console.error('Tutor AI failed:', e.message); }

  // offline fallback: best matching lesson by keyword overlap
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const scored = course.lessons.map((l) => ({ l, s: words.filter((w) => `${l.title} ${l.topic} ${l.content}`.toLowerCase().includes(w)).length })).sort((a, b) => b.s - a.s);
  const best = scored[0]?.s ? scored[0].l : null;
  res.json({
    source: 'offline',
    answer: best
      ? `(Offline mode) The most relevant lesson is "${best.title}":\n\n${best.content.slice(0, 600)}\n\nAdd an AI key in backend/.env for full explanations.`
      : `(Offline mode) I could not find this in "${course.title}" lessons. Try a keyword from a lesson title, or set AI_PROVIDER and an API key for full answers.`,
  });
});

// POST /api/ai/study-plan  { courseId, days, hoursPerDay }
exports.studyPlan = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.body.days, 10) || 7, 3), 14);
  const hours = Math.min(Math.max(parseFloat(req.body.hoursPerDay) || 1, 0.5), 6);
  const course = await getCourse(req.user, req.body.courseId);
  const weak = await weakTopics(req.user._id, course._id);
  const weakNames = weak.map((w) => w.topic);
  const order = [...weakNames, ...course.topics.filter((t) => !weakNames.includes(t))];
  if (!order.length) throw new ApiError(400, 'This course has no topics yet');

  const offline = () => Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    if (day === days) return { day, focus: 'Review + mock quiz', tasks: [`Take a mixed-topic quiz (${Math.round(hours * 30)} min)`, 'Re-read notes for any question you missed', 'Make flashcards for your weakest topic'] };
    const topic = order[i % Math.min(order.length, weakNames.length ? Math.max(weakNames.length, 2) : order.length)];
    const lesson = course.lessons.find((l) => (l.topic || '').toLowerCase() === topic.toLowerCase());
    return { day, focus: topic, tasks: [`Study ${lesson ? `"${lesson.title}"` : topic} (${Math.round(hours * 40)} min)`, `Practise a 5-question ${weakNames.includes(topic) ? 'easy' : 'medium'} quiz on ${topic} (${Math.round(hours * 20)} min)`, 'Write 3 key points in your own words'] };
  });

  let plan = null, source = 'offline';
  try {
    const text = await askAI(`Create a ${days}-day study plan for the course "${course.title}". Student has ${hours} hour(s) per day. Weak topics (prioritise first): ${weakNames.join(', ') || 'none'}. All topics: ${course.topics.join(', ')}.
Return ONLY JSON: {"plan":[{"day":1,"focus":"","tasks":["","",""]}]} with exactly ${days} days and 2-4 short tasks each.`, { json: true });
    const list = clean(text)?.plan;
    if (Array.isArray(list) && list.length === days && list.every((d) => d.focus && Array.isArray(d.tasks) && d.tasks.length)) {
      plan = list.map((d, i) => ({ day: i + 1, focus: str(d.focus, 80), tasks: d.tasks.slice(0, 5).map((t) => str(t, 200)) }));
      source = 'ai';
    }
  } catch (e) { console.error('Study plan AI failed:', e.message); }
  res.json({ plan: plan || offline(), weakTopics: weak.map((w) => ({ topic: w.topic, accuracy: w.accuracy })), source, course: course.title, days, hoursPerDay: hours });
});

// POST /api/ai/flashcards  { courseId, topic, count }
exports.flashcards = asyncHandler(async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.body.count, 10) || 8, 4), 15);
  const topic = str(req.body.topic, 80) || null;
  const course = await getCourse(req.user, req.body.courseId);
  if (topic && !course.topics.some((t) => t.toLowerCase() === topic.toLowerCase())) throw new ApiError(400, 'Unknown topic');

  try {
    const text = await askAI(`Create ${count} study flashcards for the course "${course.title}"${topic ? `, topic "${topic}"` : ''}. Use this material when helpful:\n${material(course, topic)}
Return ONLY JSON: {"cards":[{"front":"short question or term","back":"clear answer under 40 words"}]}`, { json: true });
    const cards = (clean(text)?.cards || []).filter((c) => c.front && c.back).slice(0, count).map((c) => ({ front: str(c.front, 200), back: str(c.back, 400) }));
    if (cards.length) return res.json({ cards, source: 'ai' });
  } catch (e) { console.error('Flashcards AI failed:', e.message); }

  const wanted = (topic ? [topic] : course.topics).map((t) => t.toLowerCase());
  const fromLessons = course.lessons.filter((l) => !topic || (l.topic || '').toLowerCase() === topic.toLowerCase()).filter((l) => l.content).map((l) => ({ front: l.title, back: l.content.slice(0, 300) }));
  const fromBank = bank.filter((b) => wanted.includes(b.topic.toLowerCase())).map((b) => ({ front: b.question, back: `${b.options[b.correctAnswer]} — ${b.explanation}` }));
  const cards = [...fromLessons, ...fromBank].sort(() => Math.random() - 0.5).slice(0, count);
  if (!cards.length) throw new ApiError(400, 'No content available for flashcards. Add lesson content or set an AI key.');
  res.json({ cards, source: 'offline' });
});