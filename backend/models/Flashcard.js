const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    front: { type: String, required: true, trim: true, maxlength: 500 },
    back: { type: String, required: true, trim: true, maxlength: 2000 },
    topic: { type: String, required: true, trim: true, maxlength: 80 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    source: { type: String, enum: ['ai', 'offline', 'custom'], default: 'custom' },
    reviewCount: { type: Number, default: 0, min: 0 },
    intervalDays: { type: Number, default: 0, min: 0 },
    nextReviewAt: { type: Date, default: Date.now, index: true },
    lastReviewedAt: Date,
    lastRating: { type: String, enum: ['known', 'difficult', 'forgotten'] },
  },
  { timestamps: true }
);

flashcardSchema.index({ user: 1, nextReviewAt: 1 });
flashcardSchema.index({ user: 1, course: 1, topic: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
