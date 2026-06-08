import rateLimit from "express-rate-limit";

export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message:
      "Too many order requests from this IP, please try again after a minute.",
    error: {
      code: "TOO_MANY_REQUESTS",
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
