const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: {
      type: String,
      required() {
        return ['pending', 'processing'].includes(this.status);
      },
      select: false,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teacherApplicationSchema.methods.matchPassword = function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('TeacherApplication', teacherApplicationSchema);
