const User = require('../models/User');
const TeacherApplication = require('../models/TeacherApplication');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const bcrypt = require('bcryptjs');

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, password, role } = req.body;
  const email = req.body.email.toLowerCase();
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');

  if (role === 'teacher') {
    const existingApplication = await TeacherApplication.findOne({ email });
    if (existingApplication && ['pending', 'processing'].includes(existingApplication.status)) {
      throw new ApiError(409, 'A teacher application for this email is already awaiting approval');
    }

    const applicationData = {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      status: 'pending',
      submittedAt: new Date(),
    };

    if (existingApplication) {
      Object.assign(existingApplication, applicationData);
      await existingApplication.save();
    } else {
      await TeacherApplication.create(applicationData);
    }

    return res.status(202).json({
      status: 'pending',
      message: 'Teacher application submitted. You can log in after an admin approves it.',
    });
  }

  const pendingApplication = await TeacherApplication.findOne({
    email,
    status: { $in: ['pending', 'processing'] },
  });
  if (pendingApplication) {
    throw new ApiError(409, 'A teacher application for this email is awaiting approval');
  }

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
  const email = req.body.email.toLowerCase();
  const { password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const application = await TeacherApplication.findOne({
      email,
      status: { $in: ['pending', 'processing'] },
    }).select('+passwordHash');
    if (application && (await application.matchPassword(password))) {
      throw new ApiError(403, 'Your teacher application is awaiting admin approval');
    }
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');
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
