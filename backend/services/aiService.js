
const ApiError = require('../utils/ApiError');
const bank = require('./questionBank');

// -------------------- CONFIGURATION --------------------

const TIMEOUT_MS = 120000;
const MAX_RETRIES = 3;
const EMPTY_RESPONSE_RETRIES = 1;

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// -------------------- PROVIDER CONFIGURATION --------------------

function getTutorProvider() {
  return (process.env.TUTOR_PROVIDER || 'openrouter')
    .trim()
    .toLowerCase();
}

function getQuizProvider() {
  return (process.env.QUIZ_PROVIDER || 'openrouter')
    .trim()
    .toLowerCase();
}

function getGeminiModel() {
  // Gemini must use GEMINI_MODEL, not QUIZ_MODEL.
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function getOpenRouterModel(purpose) {
  const model =
    purpose === 'quiz'
      ? process.env.QUIZ_MODEL
      : process.env.TUTOR_MODEL;

  return model || 'openrouter/free';
}

function getAllowedTopics({ topics = [], focusTopic }) {
  const result = focusTopic ? [focusTopic] : topics;
  return result.filter(Boolean);
}

// -------------------- PROMPT BUILDER --------------------

function buildPrompt({
  courseTitle,
  description,
  topics = [],
  focusTopic,
  difficulty,
  count,
  material,
}) {
  const allowedTopics = getAllowedTopics({
    topics,
    focusTopic,
  });

  if (!allowedTopics.length) {
    throw new ApiError(400, 'At least one topic is required.');
  }

  return `
You are an expert computer science and academic teacher.

Generate exactly ${count} high-quality multiple-choice questions.

COURSE:
${courseTitle || 'General Knowledge'}

DESCRIPTION:
${description || 'Not provided'}

TOPICS:
${JSON.stringify(allowedTopics)}

FOCUS TOPIC:
${focusTopic || 'Cover the allowed topics'}

DIFFICULTY:
${difficulty}

COURSE MATERIAL:
${material || 'Use established and accurate subject knowledge.'}

STRICT RULES:

1. Generate exactly ${count} questions.
2. Each question must have exactly four options.
3. There must be exactly one correct option.
4. correctAnswer must be a zero-based integer from 0 to 3.
5. Every question must have a meaningful explanation.
6. Every topic must exactly match one of the allowed topic labels.
7. Every question must match the requested difficulty: ${difficulty}.
8. Do not repeat questions.
9. Do not use "All of the above" or "None of the above".
10. Avoid ambiguous questions and multiple correct answers.
11. Use course material when provided.
12. Do not invent facts.

Return ONLY valid JSON.
Do not include Markdown code fences or additional explanations.

Required JSON structure:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer",
      "topic": "${allowedTopics[0]}",
      "difficulty": "${difficulty}"
    }
  ]
}
`;
}

// -------------------- HTTP REQUEST WITH RETRIES --------------------

async function fetchJson(url, options = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const rawText = await response.text();

      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { rawResponse: rawText.slice(0, 1000) };
      }

      if (response.ok) {
        return data;
      }

      const errorMessage =
        data?.error?.message ||
        data?.message ||
        data?.rawResponse ||
        `AI request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;

      // Do not retry authentication, invalid request or quota errors.
      if (
        ![408, 429, 500, 502, 503, 504].includes(response.status)
      ) {
        throw error;
      }

      lastError = error;

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      console.warn(
        `[AI] HTTP ${response.status}. Retry ${attempt + 1}/${MAX_RETRIES}`
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        lastError = new Error('AI request timed out.');
        lastError.retryable = true;
      } else {
        lastError = error;
      }

      // Do not retry permanent HTTP errors.
      if (
        error.status &&
        ![408, 429, 500, 502, 503, 504].includes(error.status)
      ) {
        throw error;
      }

      const retryable =
        error.retryable === true ||
        error.status === undefined ||
        [408, 429, 500, 502, 503, 504].includes(error.status);

      if (!retryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      console.warn(
        `[AI] Request failed. Retry ${attempt + 1}/${MAX_RETRIES}: ${lastError.message}`
      );
    } finally {
      clearTimeout(timer);
    }

    const delay = Math.min(2000 * (2 ** attempt), 10000);

    console.log(
      `[AI] Retrying in ${delay / 1000} seconds...`
    );

    await sleep(delay);
  }

  throw lastError || new Error('AI request failed.');
}

// -------------------- GEMINI PROVIDER --------------------

async function callGemini(prompt, { json = true } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in backend/.env');
  }

  const model = getGeminiModel();

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent`;

  const generationConfig = {
    temperature: 0.6,
    maxOutputTokens: 8192,
  };

  if (json) {
    generationConfig.responseMimeType = 'application/json';
  }

  const data = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    }),
  });

  const candidate = data?.candidates?.[0];

  if (!candidate) {
    throw new Error(
      data?.promptFeedback?.blockReason
        ? `Gemini blocked the prompt: ${data.promptFeedback.blockReason}`
        : 'Gemini returned no response.'
    );
  }

  const text = candidate.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error(
      `Gemini returned empty content. Finish reason: ${
        candidate.finishReason || 'unknown'
      }`
    );
  }

  return text;
}

// -------------------- OPENROUTER RESPONSE HANDLING --------------------

function extractOpenRouterContent(data) {
  const choice = data?.choices?.[0];
  const message = choice?.message;

  if (!message) {
    return {
      content: '',
      finishReason: choice?.finish_reason || 'no_choice',
      model: data?.model || 'unknown',
      error: data?.error || null,
    };
  }

  let content = message.content;

  // Some models/providers return content as an array.
  if (Array.isArray(content)) {
    content = content
      .map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || '';
      })
      .join('');
  }

  if (typeof content !== 'string') {
    content = '';
  }

  return {
    content: content.trim(),
    finishReason: choice?.finish_reason || 'unknown',
    model: data?.model || 'unknown',
    refusal: message.refusal || null,
    error: data?.error || null,
  };
}

// -------------------- OPENROUTER PROVIDER --------------------

async function callOpenRouter(
  prompt,
  { json = false, purpose = 'tutor' } = {}
) {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.TUTOR_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is missing in backend/.env'
    );
  }

  const model = getOpenRouterModel(purpose);

  const body = {
    model,
    temperature: 0.6,
    max_tokens: purpose === 'quiz' ? 8192 : 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  // IMPORTANT:
  // openrouter/free can dynamically select different models.
  // Not every free model supports JSON response_format.
  // The quiz prompt already explicitly requests valid JSON.
  // Enable JSON mode only if explicitly configured.
  if (
    json &&
    process.env.OPENROUTER_JSON_MODE === 'true'
  ) {
    body.response_format = {
      type: 'json_object',
    };
  }

  let lastError;

  for (
    let attempt = 0;
    attempt <= EMPTY_RESPONSE_RETRIES;
    attempt++
  ) {
    const data = await fetchJson(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer':
            process.env.OPENROUTER_SITE_URL ||
            'http://localhost:5173',
          'X-Title':
            process.env.OPENROUTER_APP_NAME ||
            'NeuroLearn',
        },
        body: JSON.stringify(body),
      }
    );

    const result = extractOpenRouterContent(data);

    if (result.content) {
      console.log(
        `[OpenRouter] Success | Model: ${result.model} | Purpose: ${purpose}`
      );

      return result.content;
    }

    // Log diagnostic information without logging API keys.
    console.error('[OpenRouter Empty Response]', {
      requestedModel: model,
      returnedModel: result.model,
      finishReason: result.finishReason,
      refusal: result.refusal,
      error: result.error,
      choicesCount: data?.choices?.length || 0,
      usage: data?.usage || null,
    });

    lastError = new Error(
      result.refusal
        ? `OpenRouter refused the request: ${result.refusal}`
        : `OpenRouter returned no usable content. Finish reason: ${result.finishReason}. Model: ${result.model}`
    );

    if (attempt < EMPTY_RESPONSE_RETRIES) {
      console.warn(
        '[OpenRouter] Empty response. Retrying once...'
      );

      await sleep(1500);
    }
  }

  throw lastError || new Error('OpenRouter returned an empty response.');
}

// -------------------- OPENAI PROVIDER --------------------

async function callOpenAI(prompt, { json = true } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.6,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  if (json) {
    body.response_format = {
      type: 'json_object',
    };
  }

  const data = await fetchJson(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI returned an empty response.');
  }

  return content.trim();
}

// -------------------- PROVIDER ROUTER --------------------

async function callAI(prompt, options = {}) {
  const {
    provider,
    purpose = 'tutor',
    ...callOptions
  } = options;

  if (!provider) {
    throw new Error('AI provider was not specified.');
  }

  if (provider === 'gemini') {
    return callGemini(prompt, callOptions);
  }

  if (provider === 'openrouter') {
    return callOpenRouter(prompt, {
      ...callOptions,
      purpose,
    });
  }

  if (provider === 'openai') {
    return callOpenAI(prompt, callOptions);
  }

  throw new Error(
    `Unsupported AI provider: "${provider}". Use openrouter, gemini, or openai.`
  );
}

// -------------------- JSON PARSER --------------------

function extractJSON(text) {
  const cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI returned invalid JSON.');
    }

    try {
      return JSON.parse(
        cleaned.slice(start, end + 1)
      );
    } catch {
      throw new Error('AI returned malformed JSON.');
    }
  }
}

// -------------------- QUESTION VALIDATION --------------------

function parseAndValidate(
  text,
  fallbackTopic,
  fallbackDifficulty,
  allowedTopics = []
) {
  const parsed = extractJSON(text);

  const list = Array.isArray(parsed)
    ? parsed
    : parsed.questions;

  if (!Array.isArray(list)) {
    throw new Error('AI response has no questions array.');
  }

  const validTopics = allowedTopics.length
    ? allowedTopics.map((topic) => topic.toLowerCase())
    : [String(fallbackTopic || 'General').toLowerCase()];

  const valid = [];

  for (const item of list) {
    const question = String(
      item?.question || ''
    ).trim();

    const options = Array.isArray(item?.options)
      ? item.options.map((option) => String(option).trim())
      : [];

    const correct = Number(item?.correctAnswer);

    const topic = String(
      item?.topic || fallbackTopic || 'General'
    ).trim();

    const difficulty = String(
      item?.difficulty || fallbackDifficulty || 'medium'
    ).toLowerCase();

    if (!question || question.length < 5) continue;

    if (
      options.length !== 4 ||
      options.some((option) => !option)
    ) {
      continue;
    }

    if (
      new Set(
        options.map((option) => option.toLowerCase())
      ).size !== 4
    ) {
      continue;
    }

    if (
      !Number.isInteger(correct) ||
      correct < 0 ||
      correct > 3
    ) {
      continue;
    }

    if (!validTopics.includes(topic.toLowerCase())) {
      continue;
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      continue;
    }

    valid.push({
      question,
      options,
      correctAnswer: correct,
      explanation: String(
        item?.explanation || ''
      ).trim(),
      topic,
      difficulty,
    });
  }

  if (!valid.length) {
    throw new Error('AI returned no valid questions.');
  }

  return valid;
}

// -------------------- OFFLINE FALLBACK --------------------

function offlineQuestions({
  topics = [],
  focusTopic,
  difficulty,
  count,
}) {
  const wanted = getAllowedTopics({
    topics,
    focusTopic,
  }).map((topic) => topic.toLowerCase());

  const pool = bank.filter((question) =>
    wanted.includes(
      String(question.topic).toLowerCase()
    )
  );

  if (!pool.length) {
    throw new ApiError(
      400,
      'No offline questions are available for these topics.'
    );
  }

  if (pool.length < count) {
    throw new ApiError(
      400,
      `Only ${pool.length} offline questions are available. Reduce the question count or use the AI provider.`
    );
  }

  const shuffle = (array) =>
    [...array].sort(() => Math.random() - 0.5);

  const matching = shuffle(
    pool.filter(
      (question) => question.difficulty === difficulty
    )
  );

  const remaining = shuffle(
    pool.filter(
      (question) => question.difficulty !== difficulty
    )
  );

  return [...matching, ...remaining]
    .slice(0, count)
    .map((question) => ({ ...question }));
}

// -------------------- AI QUIZ GENERATION --------------------

async function generateQuiz(opts) {
  const provider = getQuizProvider();

  if (
    !Number.isInteger(opts.count) ||
    opts.count < 1 ||
    opts.count > 30
  ) {
    throw new ApiError(
      400,
      'Question count must be between 1 and 30.'
    );
  }

  if (!['easy', 'medium', 'hard'].includes(opts.difficulty)) {
    throw new ApiError(400, 'Invalid quiz difficulty.');
  }

  if (provider === 'mock') {
    return {
      questions: offlineQuestions(opts),
      source: 'offline',
    };
  }

  try {
    const prompt = buildPrompt(opts);

    const response = await callAI(prompt, {
      provider,
      purpose: 'quiz',
      json: true,
    });

    const questions = parseAndValidate(
      response,
      opts.focusTopic || opts.topics?.[0],
      opts.difficulty,
      getAllowedTopics(opts)
    );

    if (questions.length < opts.count) {
      throw new Error(
        `AI returned ${questions.length} valid questions, but ${opts.count} were requested.`
      );
    }

    console.log(
      `[AI] Quiz generated successfully using ${provider}`
    );

    return {
      questions: questions.slice(0, opts.count),
      source: provider,
    };
  } catch (error) {
    console.error(
      '[AI Quiz Error]',
      error.message
    );

    // Offline fallback
    try {
      return {
        questions: offlineQuestions(opts),
        source: 'offline',
        warning:
          `AI generation failed: ${error.message}. ` +
          'Offline questions are being used.',
      };
    } catch (fallbackError) {
      if (fallbackError instanceof ApiError) {
        throw new ApiError(
          502,
          `AI generation failed and offline fallback is unavailable: ${error.message}`
        );
      }

      throw new ApiError(
        502,
        `AI generation failed: ${error.message}`
      );
    }
  }
}

// -------------------- AI TUTOR / STUDY PLAN / FLASHCARDS --------------------

async function askAI(prompt, { json = false } = {}) {
  const provider = getTutorProvider();

  if (provider === 'mock') {
    return null;
  }

  if (
    provider === 'openrouter' &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.TUTOR_API_KEY
  ) {
    throw new ApiError(
      503,
      'OpenRouter API key is not configured.'
    );
  }

  if (
    provider === 'gemini' &&
    !process.env.GEMINI_API_KEY
  ) {
    throw new ApiError(
      503,
      'Gemini API key is not configured.'
    );
  }

  if (
    provider === 'openai' &&
    !process.env.OPENAI_API_KEY
  ) {
    throw new ApiError(
      503,
      'OpenAI API key is not configured.'
    );
  }

  try {
    const response = await callAI(prompt, {
      provider,
      purpose: 'tutor',
      json,
    });

    if (!response) {
      throw new Error('AI returned an empty response.');
    }

    return response;
  } catch (error) {
    console.error(
      '[AI Tutor Error]',
      error.message
    );

    throw new ApiError(
      502,
      `AI service error: ${error.message}`
    );
  }
}

// -------------------- EXPORTS --------------------

module.exports = {
  generateQuiz,
  parseAndValidate,
  askAI,
};
