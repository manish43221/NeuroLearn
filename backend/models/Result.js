const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: String,
    options: [String],
    selected: Number, // -1 = unanswered
    correctAnswer: Number,
    explanation: String,
    topic: String,
    isCorrect: Boolean,
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    quizTitle: String,
    difficulty: String,
    score: { type: Number, required: true }, // percentage 0-100
    correct: Number,
    total: Number,
    timeTaken: { type: Number, default: 0 }, // seconds
    topicBreakdown: [{ _id: false, topic: String, correct: Number, total: Number }],
    answers: [answerSchema], // snapshot, so history survives quiz deletion
  },
  { timestamps: true }
);

module.exports = mongoose.model('Result', resultSchema);
