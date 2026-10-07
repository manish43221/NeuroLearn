// Wraps async controllers so thrown errors reach the error middleware
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
