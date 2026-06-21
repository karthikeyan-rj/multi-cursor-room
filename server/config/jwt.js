const DEV_FALLBACK = 'dev-jwt-secret-do-not-use-in-production';

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production.\n' +
      'Set a strong, random JWT_SECRET in your environment variables.'
    );
  }
  console.warn(
    'WARNING: JWT_SECRET not set. Using insecure dev-only fallback.\n' +
    '  Set JWT_SECRET in server/.env for development or in environment variables for production.'
  );
  return DEV_FALLBACK;
}

const JWT_SECRET = getJwtSecret();

module.exports = { JWT_SECRET };
