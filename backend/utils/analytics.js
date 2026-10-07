const Result = require('../models/Result');

const WEAK = 60; // accuracy below this => weak topic
const STRONG = 80; // accuracy at/above this => strong topic
const LEVELS = ['easy', 'medium', 'hard'];

// Aggregate topic-wise accuracy from a list of results (newest first)
function topicStats(results) {
  const map = new Map();
  for (const r of results) {
    for (const t of r.topicBreakdown || []) {
      const m = map.get(t.topic) || { topic: t.topic, correct: 0, total: 0, course: null };
      m.correct += t.correct;
      m.total += t.total;
      if (!m.course) m.course = r.course?._id || r.course;
      map.set(t.topic, m);
    }
  }
  return [...map.values()]
    .map((m) => {
      const accuracy = Math.round((m.correct / m.total) * 100);
      const level = accuracy < WEAK ? 'weak' : accuracy >= STRONG ? 'strong' : 'good';
      return { ...m, accuracy, level };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

// Consecutive days (ending today/yesterday) with at least one quiz
function streak(dates) {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(d.toDateString())) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function badges({ quizzes, avg, best, streakDays }) {
  const list = [];
  if (quizzes >= 1) list.push({ name: 'First Quiz', icon: '🎯' });
  if (quizzes >= 10) list.push({ name: 'Quiz Master', icon: '🏆' });
  if (best === 100) list.push({ name: 'Perfect Score', icon: '💯' });
  if (streakDays >= 3) list.push({ name: `${streakDays}-Day Streak`, icon: '🔥' });
  if (quizzes >= 3 && avg >= 80) list.push({ name: 'High Achiever', icon: '⭐' });
  return list;
}

// Adaptive difficulty: move up when the last score > 80%, down when < 50%
async function suggestDifficulty(userId, courseId) {
  const last = await Result.findOne({ user: userId, course: courseId })
    .sort('-createdAt')
    .select('score difficulty');
  if (!last) return 'easy';
  let idx = Math.max(LEVELS.indexOf(last.difficulty), 0);
  if (last.score > 80) idx = Math.min(idx + 1, 2);
  else if (last.score < 50) idx = Math.max(idx - 1, 0);
  return LEVELS[idx];
}

module.exports = { WEAK, STRONG, topicStats, streak, badges, suggestDifficulty };
