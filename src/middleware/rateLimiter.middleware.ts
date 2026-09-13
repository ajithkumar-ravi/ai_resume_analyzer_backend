import rateLimit from 'express-rate-limit';

export const analyzeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests per 15 minutes window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many analysis requests. Please wait a moment before submitting another resume.',
    });
  },
});

