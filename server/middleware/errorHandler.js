function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
}

module.exports = errorHandler;
