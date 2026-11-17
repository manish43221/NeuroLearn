const mongoose = require('mongoose');

const flashcardReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    flashcard: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true, index: true },
    rating: { type: String, enum: ['known', 'difficult', 'forgotten'], required: true },
    reviewedAt: { type: Date, default: Date.now, index: true },
    nextReviewAt: { type: Date, required: true },
  },
  { timestamps: false }
);

flashcardReviewSchema.index({ user: 1, reviewedAt: 1 });

module.exports = mongoose.model('FlashcardReview', flashcardReviewSchema);
