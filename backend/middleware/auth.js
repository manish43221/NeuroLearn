const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT and attaches the user to req.user
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) throw new ApiError(401, 'Not authorized, token missing');

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User no longer exists');
  req.user = user;
  next();
});

// Role-based access control
exports.authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do this'));
    }
    next();
  };
