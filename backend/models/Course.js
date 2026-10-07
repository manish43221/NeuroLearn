const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Lesson title is required'], trim: true },
  topic: { type: String, trim: true },
  content: { type: String, default: '' },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    category: { type: String, default: 'General', trim: true },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    topics: [{ type: String, trim: true }],
    lessons: [lessonSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);
