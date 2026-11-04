
const Course = require('../models/Course');
const Result = require('../models/Result');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bank = require('../services/questionBank');
const { askAI } = require('../services/aiService');
const { topicStats } = require('../utils/analytics');

// -------------------- HELPERS --------------------

const clean = (t) => {
  try {
    return JSON.parse(
      String(t).replace(/```json|```/gi, '').trim()
    );
  } catch {
    return null;
  }
};

const str = (v, max = 400) =>
  String(v ?? '').trim().slice(0, max);

async function getCourse(user, id) {
  const course = await Course.findById(id);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  if (
    user.role === 'student' &&
    !user.enrollments.some(
      (e) => String(e.course) === String(course._id)
    )
  ) {
    throw new ApiError(403, 'Enrol in this course first');
  }

  return course;
}

const weakTopics = async (userId, courseId) =>
  topicStats(
    await Result.find({
      user: userId,
      course: courseId,
    }).select('topicBreakdown course')
  ).filter((t) => t.level === 'weak' && t.total >= 2);

const material = (course, topic) =>
  course.lessons
    .filter(
      (l) =>
        !topic ||
        (l.topic || '').toLowerCase() === topic.toLowerCase()
    )
    .map((l) => `${l.title}: ${l.content}`)
    .join('\n')
    .slice(0, 6000);


// -------------------- AI TUTOR --------------------

// POST /api/ai/tutor
// Body: { courseId, question, history }

exports.tutor = asyncHandler(async (req, res) => {
  const question = str(req.body.question, 500);

  if (question.length < 3) {
    throw new ApiError(400, 'Please type a question');
  }

  const course = await getCourse(req.user, req.body.courseId);

  const weak = await weakTopics(
    req.user._id,
    course._id
  );

  // Validate and limit conversation history.
  const history = Array.isArray(req.body.history)
    ? req.body.history
        .filter(
          (message) =>
            ['user', 'assistant'].includes(message?.role) &&
            typeof message?.content === 'string' &&
            message.content.trim()
        )
        .slice(-10)
        .map((message) => ({
          role: message.role,
          content: str(message.content, 1200),
        }))
    : [];

  const conversation = history
    .map(
      (message) =>
        `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.content}`
    )
    .join('\n\n');

  const courseMaterial = material(course);

  const prompt = `
You are an expert and friendly academic tutor.

COURSE:
${course.title}

YOUR TEACHING RULES:
1. Explain concepts clearly and accurately.
2. Use simple language when teaching beginners.
3. Give practical examples wherever useful.
4. For programming questions, explain the logic step by step.
5. For code questions, identify errors and explain corrections.
6. Keep normal answers concise, usually under 250 words.
7. Use previous conversation to understand follow-up questions.
8. Avoid unnecessarily repeating previous explanations.
9. Help with questions outside the course when they are within your knowledge.
10. Never invent facts. Admit uncertainty when necessary.

STUDENT'S WEAK TOPICS:
${weak.map((w) => w.topic).join(', ') || 'No weak topics identified yet.'}

COURSE MATERIAL:
${courseMaterial || 'No course lesson material is available.'}

PREVIOUS CONVERSATION:
${conversation || 'This is the beginning of the conversation.'}

LATEST STUDENT QUESTION:
${question}

Answer the latest question using the previous conversation when relevant.
`;

  try {
    const answer = await askAI(prompt);

    if (answer) {
      return res.json({
        answer: answer.trim(),
        source: 'ai',
      });
    }
  } catch (error) {
    console.error('Tutor AI failed:', error.message);
  }

  // -------------------- OFFLINE FALLBACK --------------------

  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);

  const scored = course.lessons
    .map((lesson) => ({
      lesson,
      score: words.filter((word) =>
        `${lesson.title} ${lesson.topic} ${lesson.content}`
          .toLowerCase()
          .includes(word)
      ).length,
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.score
    ? scored[0].lesson
    : null;

  return res.json({
    source: 'offline',
    answer: best
      ? `(Offline mode) The most relevant lesson is "${best.title}":\n\n${best.content.slice(0, 600)}\n\nAdd an AI key in backend/.env for full explanations.`
      : `(Offline mode) I could not find this in "${course.title}" lessons. Try a keyword from a lesson title, or set AI_PROVIDER and an API key for full answers.`,
  });
});


// -------------------- STUDY PLAN --------------------

// POST /api/ai/study-plan
// Body: { courseId, days, hoursPerDay }

exports.studyPlan = asyncHandler(async (req, res) => {
  const days = Math.min(
    Math.max(parseInt(req.body.days, 10) || 7, 3),
    14
  );

  const hours = Math.min(
    Math.max(parseFloat(req.body.hoursPerDay) || 1, 0.5),
    6
  );

  const course = await getCourse(
    req.user,
    req.body.courseId
  );

  const weak = await weakTopics(
    req.user._id,
    course._id
  );

  const weakNames = weak.map((w) => w.topic);

  const order = [
    ...weakNames,
    ...course.topics.filter(
      (topic) => !weakNames.includes(topic)
    ),
  ];

  if (!order.length) {
    throw new ApiError(400, 'This course has no topics yet');
  }

  const offline = () =>
    Array.from({ length: days }, (_, i) => {
      const day = i + 1;

      if (day === days) {
        return {
          day,
          focus: 'Review + mock quiz',
          tasks: [
            `Take a mixed-topic quiz (${Math.round(hours * 30)} min)`,
            'Re-read notes for any question you missed',
            'Make flashcards for your weakest topic',
          ],
        };
      }

      const topic =
        order[
          i %
            Math.min(
              order.length,
              weakNames.length
                ? Math.max(weakNames.length, 2)
                : order.length
            )
        ];

      const lesson = course.lessons.find(
        (l) =>
          (l.topic || '').toLowerCase() ===
          topic.toLowerCase()
      );

      return {
        day,
        focus: topic,
        tasks: [
          `Study ${lesson ? `"${lesson.title}"` : topic} (${Math.round(hours * 40)} min)`,
          `Practise a 5-question ${weakNames.includes(topic) ? 'easy' : 'medium'} quiz on ${topic} (${Math.round(hours * 20)} min)`,
          'Write 3 key points in your own words',
        ],
      };
    });

  let plan = null;
  let source = 'offline';

  try {
    const text = await askAI(
      `Create a ${days}-day study plan for the course "${course.title}". Student has ${hours} hour(s) per day.

Weak topics (prioritise first): ${weakNames.join(', ') || 'none'}.

All topics: ${course.topics.join(', ')}.

Return ONLY JSON:
{"plan":[{"day":1,"focus":"","tasks":["","",""]}]}

Generate exactly ${days} days with 2-4 short tasks each.`,
      { json: true }
    );

    const list = clean(text)?.plan;

    if (
      Array.isArray(list) &&
      list.length === days &&
      list.every(
        (d) =>
          d.focus &&
          Array.isArray(d.tasks) &&
          d.tasks.length
      )
    ) {
      plan = list.map((d, i) => ({
        day: i + 1,
        focus: str(d.focus, 80),
        tasks: d.tasks
          .slice(0, 5)
          .map((task) => str(task, 200)),
      }));

      source = 'ai';
    }
  } catch (error) {
    console.error('Study plan AI failed:', error.message);
  }

  return res.json({
    plan: plan || offline(),
    weakTopics: weak.map((w) => ({
      topic: w.topic,
      accuracy: w.accuracy,
    })),
    source,
    course: course.title,
    days,
    hoursPerDay: hours,
  });
});


// -------------------- FLASHCARDS --------------------

// POST /api/ai/flashcards
// Body: { courseId, topic, count }

exports.flashcards = asyncHandler(async (req, res) => {
  const count = Math.min(
    Math.max(parseInt(req.body.count, 10) || 8, 4),
    15
  );

  const topic = str(req.body.topic, 80) || null;

  const course = await getCourse(
    req.user,
    req.body.courseId
  );

  if (
    topic &&
    !course.topics.some(
      (t) => t.toLowerCase() === topic.toLowerCase()
    )
  ) {
    throw new ApiError(400, 'Unknown topic');
  }

  try {
    const text = await askAI(
      `Create ${count} study flashcards for the course "${course.title}"${topic ? `, topic "${topic}"` : ''}.

Use this material when helpful:
${material(course, topic)}

Return ONLY JSON:
{"cards":[{"front":"short question or term","back":"clear answer under 40 words"}]}`,
      { json: true }
    );

    const cards = (clean(text)?.cards || [])
      .filter((card) => card.front && card.back)
      .slice(0, count)
      .map((card) => ({
        front: str(card.front, 200),
        back: str(card.back, 400),
      }));

    if (cards.length) {
      return res.json({
        cards,
        source: 'ai',
      });
    }
  } catch (error) {
    console.error('Flashcards AI failed:', error.message);
  }

  // Offline fallback.
  const wanted = (
    topic ? [topic] : course.topics
  ).map((t) => t.toLowerCase());

  const fromLessons = course.lessons
    .filter(
      (lesson) =>
        !topic ||
        (lesson.topic || '').toLowerCase() ===
          topic.toLowerCase()
    )
    .filter((lesson) => lesson.content)
    .map((lesson) => ({
      front: lesson.title,
      back: lesson.content.slice(0, 300),
    }));

  const fromBank = bank
    .filter((b) =>
      wanted.includes(b.topic.toLowerCase())
    )
    .map((b) => ({
      front: b.question,
      back: `${b.options[b.correctAnswer]} — ${b.explanation}`,
    }));

  const cards = [
    ...fromLessons,
    ...fromBank,
  ]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  if (!cards.length) {
    throw new ApiError(
      400,
      'No content available for flashcards. Add lesson content or set an AI key.'
    );
  }

  return res.json({
    cards,
    source: 'offline',
  });
});
