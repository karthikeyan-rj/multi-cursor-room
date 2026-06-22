function createCorsOptions() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            'CORS BLOCKED: ALLOWED_ORIGINS not set in production.\n' +
            '  Set ALLOWED_ORIGINS to your frontend URL(s) in environment variables.'
          );
          return callback(new Error('Not allowed by CORS'));
        }
        return callback(null, true);
      }

      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  };
}

module.exports = { createCorsOptions };
