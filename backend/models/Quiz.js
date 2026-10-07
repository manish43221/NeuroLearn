const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: [(v) => v.length === 4, 'Each question needs exactly 4 options'],
  },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 }, // index into options
  explanation: { type: String, default: '' },
  topic: { type: String, default: 'General' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
});

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    topic: { type: String, default: 'All topics' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    questions: [questionSchema],
    source: { type: String, default: 'ai' }, // gemini | openai | offline
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
