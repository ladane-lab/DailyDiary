/**
 * Security Configuration for DailyDiary.in
 */
export const SECURITY_CONFIG = {
  // Authentication & Lockout Settings
  auth: {
    maxFailedAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    progressiveDelaysMs: [0, 2000, 5000, 10000, 30000], // [1st, 2nd, 3rd, 4th, 5th] failure delays
    maxDeviceFingerprintsPerUser: 10, // Keep last 10 trusted devices
  },

  // CORS Allowed Origins
  cors: {
    allowedOrigins: [
      process.env.FRONTEND_URL || 'https://dailydiary.in',
      'https://www.dailydiary.in',
    ].filter(Boolean),
  },

  // Payload Size Limits (in bytes)
  limits: {
    jsonPayload: 1 * 1024 * 1024,      // 1 MB
    avatarUpload: 2 * 1024 * 1024,     // 2 MB
    generalImageUpload: 10 * 1024 * 1024 // 10 MB
  },

  // Risk Score Configuration (0 - 100 scale)
  riskScore: {
    weights: {
      botUserAgent: 40,
      invalidSuspiciousHeaders: 20,
      honeypotFilled: 40,
      unknownDevice: 20,
      badIpHistory: 30,
      fastRepeatedRequests: 20,
    },
    thresholds: {
      allowMax: 30,       // 0-30: Allow
      delayMax: 60,       // 31-60: Delay (Progressive HTTP 429)
      turnstileMax: 80,   // 61-80: Cloudflare Turnstile verification
      // 81-100: Block (HTTP 403)
    }
  },

  // Cloudflare Turnstile Settings
  turnstile: {
    secretKey: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || (process.env.NODE_ENV !== 'production' ? '1x0000000000000000000000000000000AA' : ''),
    verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  },

  // Adaptive Security Configuration
  adaptiveMode: {
    checkWindowSeconds: 60, // Track events in 60s windows
    highAlertThreshold: 50, // Transition to HIGH_ALERT if security event count > 50
    cooldownPeriodMinutes: 5, // Return to NORMAL after 5 minutes of quiet
    rateLimitStricterMultiplier: 0.5, // Reduce rate limits by 50% under HIGH_ALERT
    ipBanDurationSeconds: 3600, // 1 hour block for abusive IPs
  },

  // Rate Limiting Rules (Sliding Window in Redis)
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes default
    maxRequests: {
      default: 100,
      strict: 15,
      auth: 5,
      ai: 10,
    }
  }
};
