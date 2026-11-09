const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const TeacherApplication = require('../models/TeacherApplication');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/users   (admin)
exports.getUsers = asyncHandler(async (req, res) => {
  res.json(await User.find().select('name email role createdAt').sort('-createdAt'));
});

// PUT /api/users/:id/role   (admin)
exports.setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(user.toSafe());
});

// DELETE /api/users/:id   (admin)
exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete yourself');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  await Promise.all([user.deleteOne(), Result.deleteMany({ user: user._id }), Quiz.deleteMany({ createdBy: user._id })]);
  res.json({ message: 'User deleted' });
});

// GET /api/users/overview   (admin) quick platform numbers
exports.overview = asyncHandler(async (req, res) => {
  const [users, courses, quizzes, results] = await Promise.all([User.countDocuments(), Course.countDocuments(), Quiz.countDocuments(), Result.countDocuments()]);
  res.json({ users, courses, quizzes, results });
});

// GET /api/users/teacher-applications   (admin)
exports.getTeacherApplications = asyncHandler(async (req, res) => {
  const applications = await TeacherApplication.find({ status: 'pending' })
    .select('name email submittedAt')
    .sort('submittedAt');
  res.json(applications);
});

// POST /api/users/teacher-applications/:id/approve   (admin)
exports.approveTeacherApplication = asyncHandler(async (req, res) => {
  const application = await TeacherApplication.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  ).select('+passwordHash');

  if (!application) {
    const exists = await TeacherApplication.exists({ _id: req.params.id });
    if (!exists) throw new ApiError(404, 'Teacher application not found');
    throw new ApiError(409, 'Teacher application is no longer pending');
  }

  let user;
  try {
    if (await User.exists({ email: application.email })) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    user = new User({
      name: application.name,
      email: application.email,
      password: application.passwordHash,
      role: 'teacher',
    });
    user.$locals.passwordIsHashed = true;
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      error = new ApiError(409, 'An account with this email already exists');
    }
    await TeacherApplication.updateOne(
      { _id: application._id, status: 'processing' },
      { $set: { status: 'pending' } }
    );
    throw error;
  }

  application.status = 'approved';
  application.passwordHash = undefined;
  await application.save();

  res.status(201).json({ user: user.toSafe(), message: 'Teacher account approved and created' });
});

// POST /api/users/teacher-applications/:id/reject   (admin)
exports.rejectTeacherApplication = asyncHandler(async (req, res) => {
  const application = await TeacherApplication.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'rejected' }, $unset: { passwordHash: 1 } },
    { new: true }
  ).select('name email status');

  if (!application) {
    const exists = await TeacherApplication.exists({ _id: req.params.id });
    if (!exists) throw new ApiError(404, 'Teacher application not found');
    throw new ApiError(409, 'Teacher application is no longer pending');
  }

  res.json({ message: 'Teacher application rejected' });
});
