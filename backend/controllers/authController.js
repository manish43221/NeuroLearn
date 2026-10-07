const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');
  const user = await User.create({
    name,
    email,
    password,
    role: role === 'teacher' ? 'teacher' : 'student', // admin can never self-register
  });
  res.status(201).json({ token: signToken(user._id), user: user.toSafe() });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');
  res.json({ token: signToken(user._id), user: user.toSafe() });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafe() });
});

// PUT /api/auth/me  (edit name / change password)
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (name) user.name = name;
  if (newPassword) {
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    user.password = newPassword;
  }
  await user.save();
  res.json({ user: user.toSafe() });
});
