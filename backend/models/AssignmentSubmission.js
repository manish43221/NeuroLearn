const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    originalName: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: fileSchema, required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
    marks: { type: Number, default: null, min: 0 },
    feedback: { type: String, default: '', maxlength: 5000 },
    evaluatedAt: { type: Date, default: null },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model('AssignmentSubmission', submissionSchema);
