const mongoose = require('mongoose');

const referenceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    instructions: { type: String, default: '', trim: true, maxlength: 10000 },
    references: { type: [referenceSchema], default: [] },
    dueAt: { type: Date, required: true },
    maxMarks: { type: Number, required: true, min: 0.01, max: 100000 },
    allowLateSubmissions: { type: Boolean, default: false },
    allowResubmissions: { type: Boolean, default: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1, dueAt: 1 });
assignmentSchema.index({ teacher: 1, createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
