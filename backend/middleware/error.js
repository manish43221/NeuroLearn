exports.notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.code === 11000) { status = 409; message = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`; }
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired token, please log in again';
  }

  if (status === 500) console.error(err);
  if (status === 500 && process.env.NODE_ENV === 'production') message = 'Server error';

  res.status(status).json({ message });
};
