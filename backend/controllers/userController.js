const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
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
