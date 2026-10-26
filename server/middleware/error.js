export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') status = 400;
  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.code === 11000) { status = 409; message = 'That record already exists'; }
  if (status === 500) console.error(err);
  res.status(status).json({ message });
}

// Wrap async route handlers so errors reach errorHandler
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
