const ApiError = require('../utils/ApiError');
const bank = require('./questionBank');

const TIMEOUT_MS = 40000;

function buildPrompt({ courseTitle, description, topics, focusTopic, difficulty, count, material }) {
  return `You are an expert teacher. Create ${count} multiple-choice questions for the course "${courseTitle}".
Course description: ${description || 'N/A'}
Topic focus: ${focusTopic || topics.join(', ')}
Difficulty: ${difficulty}
Allowed topic labels: ${JSON.stringify(focusTopic ? [focusTopic] : topics)}
${material ? `Course material (use it when helpful):\n${material}\n` : ''}
Rules:
- Exactly 4 options per question and exactly ONE correct option.
- "correctAnswer" is the 0-based index of the correct option.
- Include a short "explanation" of why the answer is correct.
- "topic" must be one of the allowed topic labels.
- Do not use "all of the above" or "none of the above".
Return ONLY valid JSON in this exact shape:
{"questions":[{"question":"","options":["","","",""],"correctAnswer":0,"explanation":"","topic":"","difficulty":"easy|medium|hard"}]}`;
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `AI request failed (${res.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    }
  );
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

async function callOpenAI(prompt) {
  const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  return data?.choices?.[0]?.message?.content || '';
}

// Never trust AI output: parse + validate every question before saving.
function parseAndValidate(text, fallbackTopic, fallbackDifficulty) {
  const cleaned = String(text).replace(/```json|```/gi, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON');
  }
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) throw new Error('AI response had no questions array');

  const valid = [];
  for (const item of list) {
    const options = Array.isArray(item?.options) ? item.options.map((o) => String(o).trim()) : [];
    const correct = Number(item?.correctAnswer);
    if (!item?.question || options.length !== 4 || options.some((o) => !o)) continue;
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) continue;
    if (new Set(options).size !== 4) continue;
    valid.push({
      question: String(item.question).trim(),
      options,
      correctAnswer: correct,
      explanation: String(item.explanation || '').trim(),
      topic: String(item.topic || fallbackTopic || 'General').trim(),
      difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : fallbackDifficulty,
    });
  }
  if (!valid.length) throw new Error('AI returned no valid questions');
  return valid;
}

function offlineQuestions({ topics, focusTopic, difficulty, count }) {
  const wanted = (focusTopic ? [focusTopic] : topics).map((t) => t.toLowerCase());
  const pool = bank.filter((b) => wanted.includes(b.topic.toLowerCase()));
  if (!pool.length) {
    throw new ApiError(
      400,
      'No AI API key is configured and the offline bank has no questions for these topics. Set AI_PROVIDER and an API key in backend/.env.'
    );
  }
  if (pool.length < count) {
    throw new ApiError(400, `Only ${pool.length} offline questions are available for these topics; reduce the question count or configure an AI provider.`);
  }
  // prefer requested difficulty, then others; shuffle inside each group
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const sorted = [...shuffle(pool.filter((p) => p.difficulty === difficulty)), ...shuffle(pool.filter((p) => p.difficulty !== difficulty))];
  return sorted.slice(0, count).map((p) => ({ ...p }));
}

async function generateQuiz(opts) {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const key = provider === 'gemini' ? process.env.GEMINI_API_KEY : provider === 'openai' ? process.env.OPENAI_API_KEY : null;

  if (provider === 'mock') return { questions: offlineQuestions(opts), source: 'offline' };

  if (!key) {
    return {
      questions: offlineQuestions(opts),
      source: 'offline',
      warning: `AI_PROVIDER is "${provider}" but no API key is set. Showing offline questions.`,
    };
  }

  try {
    const prompt = buildPrompt(opts);
    const text = provider === 'gemini' ? await callGemini(prompt) : await callOpenAI(prompt);
    const questions = parseAndValidate(text, opts.focusTopic || opts.topics[0], opts.difficulty);
    if (questions.length < opts.count) {
      throw new Error(`AI returned ${questions.length} questions; ${opts.count} were requested`);
    }
    return { questions: questions.slice(0, opts.count), source: provider };
  } catch (err) {
    console.error('AI generation failed:', err.message);
    try {
      return { questions: offlineQuestions(opts), source: 'offline', warning: `AI service failed (${err.message}). Showing offline questions instead.` };
    } catch (fallbackError) {
      if (fallbackError instanceof ApiError) throw fallbackError;
      throw new ApiError(502, `AI quiz generation failed: ${err.message}`);
    }
  }
}


// Generic helper used by tutor / study plan / flashcards. Returns null when no AI key is configured.
async function askAI(prompt, { json = false } = {}) {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, ...(json && { responseMimeType: 'application/json' }) } }),
    });
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || null;
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.6, ...(json && { response_format: { type: 'json_object' } }), messages: [{ role: 'user', content: prompt }] }),
    });
    return data?.choices?.[0]?.message?.content || null;
  }
  return null;
}

module.exports = { generateQuiz, parseAndValidate, askAI };