const rateLimit = require('express-rate-limit');

// BE-2: brute-force / abuse protection.
// 429 bodies use the shared { errorCode, message } shape so the frontend's
// generic error handling (and its new 429 branch) renders them cleanly.

// Global limiter — matches the README's stated 300 requests / 15 min per IP.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    errorCode: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down and try again later.',
  },
});

// Stricter limiter on login to blunt credential brute-force. Only failed
// attempts count, so a legitimate user logging in normally is never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    errorCode: 'RATE_LIMITED',
    message: 'Too many login attempts. Please try again in about 15 minutes.',
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    errorCode: 'RATE_LIMITED',
    message: 'Too many password reset requests. Please try again in about 15 minutes.',
  },
});

module.exports = { globalLimiter, loginLimiter, forgotPasswordLimiter };
