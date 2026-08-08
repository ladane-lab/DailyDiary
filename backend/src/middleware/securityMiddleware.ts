import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { SECURITY_CONFIG } from '../config/securityConfig.js';
import { csrfProtection } from '../security/csrf.js';
import { calculateRiskScore, enforceRiskPolicy } from '../security/riskEngine.js';
import { isIpBlocked, registerSecurityIncident, getAlertLevel } from '../security/attackDetector.js';
import redisService from '../services/redisService.js';
import logger from '../lib/logger.js';

/**
 * Configure Helmet middleware with strict CSP and HSTS
 */
export const configureHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xPoweredBy: false,
});

/**
 * Strict CORS Configuration
 */
export const configureCors = cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy: Origin missing.'), false);
      }
      return;
    }

    const isAllowed = SECURITY_CONFIG.cors.allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ));

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`[CORS Blocked] Unauthorized origin attempted connection: ${origin}`);
      callback(new Error('CORS Policy: Origin not allowed.'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Device-Fingerprint',
    'X-Turnstile-Token',
  ],
});

/**
 * Validates request payload size limits
 */
export const limitPayloadSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxLimit = SECURITY_CONFIG.limits.jsonPayload; // 1 MB default
    if (size > maxLimit) {
      res.status(413).json({ error: 'Payload too large. Limit is 1MB.' });
      return;
    }
  }
  next();
};

/**
 * Global Pre-Authentication Security Guard
 * Handles IP ban checks, CORS filters, and global/IP rate limiting.
 */
export const globalSecurityGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || '0.0.0.0';

  // 1. IP Ban Check (Fast Cache Check)
  const isBlocked = await isIpBlocked(ip);
  if (isBlocked) {
    res.status(403).json({ error: 'Access denied. Your IP has been temporarily blacklisted.' });
    return;
  }

  // 2. Rate Limiting (Sliding Window in Redis)
  const path = req.path;
  const alertLevel = await getAlertLevel();
  
  let limit = SECURITY_CONFIG.rateLimiting.maxRequests.default; // 100
  let windowMs = SECURITY_CONFIG.rateLimiting.windowMs;

  // Classify endpoints for specific limits
  if (path.includes('/api/upload')) {
    limit = SECURITY_CONFIG.rateLimiting.maxRequests.strict; // 15
  } else if (path.includes('/sync') || path.includes('/me')) {
    limit = SECURITY_CONFIG.rateLimiting.maxRequests.auth; // 5
    windowMs = 60 * 1000; // 1 minute window for auth
  } else if (path.includes('/api/ai')) {
    limit = SECURITY_CONFIG.rateLimiting.maxRequests.ai; // 10
  }

  // Under HIGH_ALERT, slash limits by 50% only for suspicious IPs (Fix #6)
  if (alertLevel === 'HIGH_ALERT') {
    const hasAnomalies = await redisService.get(`anomalies:ip:${ip}`);
    if (hasAnomalies) {
      limit = Math.max(1, Math.ceil(limit * SECURITY_CONFIG.adaptiveMode.rateLimitStricterMultiplier));
    }
  }

  const rateKey = `rate:${path}:${ip}`;
  const rateCheck = await redisService.isRateLimited(rateKey, limit, windowMs);
  
  if (rateCheck.limited) {
    await registerSecurityIncident(ip);
    
    const resetSeconds = Math.ceil((rateCheck.resetTimeMs - Date.now()) / 1000);
    res.setHeader('Retry-After', String(resetSeconds));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfterSeconds: resetSeconds
    });
    return;
  }

  next();
};

/**
 * Authenticated Security Guard
 * Executes AFTER authenticate middleware. Performs CSRF check, honeypot validations,
 * user-specific risk calculations (fingerprints, headers, bad IP history), and Turnstile checks.
 */
export const authenticatedSecurityGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || '0.0.0.0';

  // 1. Double Submit CSRF Token Check (Bypassed automatically for Bearer tokens)
  let passedCsrf = false;
  await new Promise<void>((resolve) => {
    csrfProtection(req, res, () => {
      passedCsrf = true;
      resolve();
    });
  });
  if (!passedCsrf) return; // CSRF middleware handles the 403 response

  // 2. Request Risk Score evaluation (Calculates device risk using req.user.uid)
  const riskResult = await calculateRiskScore(req);
  const shouldProceed = await enforceRiskPolicy(req, res, riskResult.score, riskResult.reasons);
  
  if (!shouldProceed) {
    if (riskResult.score > 50) {
      await registerSecurityIncident(ip);
    }
    return; // Policy handles response (429, 400 or 403)
  }

  next();
};

/**
 * Magic Bytes & File Upload Security Validator
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;
  if (!file) {
    next();
    return;
  }

  // 1. Validate File Size
  const maxLimit = req.path.includes('/avatar') 
    ? SECURITY_CONFIG.limits.avatarUpload // 2MB
    : SECURITY_CONFIG.limits.generalImageUpload; // 10MB
  
  if (file.size > maxLimit) {
    res.status(413).json({ error: `File is too large. Max allowed is ${maxLimit / 1024 / 1024}MB.` });
    return;
  }

  // 2. Validate Extension Whitelist
  const extensionWhitelist = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const filename = file.originalname.toLowerCase();
  const hasAllowedExt = extensionWhitelist.some(ext => filename.endsWith(ext));

  if (!hasAllowedExt) {
    res.status(400).json({ error: 'Invalid file extension. Allowed: JPG, PNG, WEBP, GIF.' });
    return;
  }

  // 3. Validate Content-Type MIME
  const mimeWhitelist = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!mimeWhitelist.includes(file.mimetype)) {
    res.status(400).json({ error: 'Invalid file MIME type.' });
    return;
  }

  // 4. Validate Magic Bytes (File Signatures)
  const hex = file.buffer.toString('hex', 0, 4).toLowerCase();
  let isValidSignature = false;

  // JPEG signature: FF D8 FF
  if (hex.startsWith('ffd8ff')) isValidSignature = true;
  // PNG signature: 89 50 4E 47
  else if (hex.startsWith('89504e47')) isValidSignature = true;
  // GIF signature: 47 49 46 38
  else if (hex.startsWith('47494638')) isValidSignature = true;
  // WEBP signature: starts with RIFF (52 49 46 46) -> offset 8: WEBP (57 45 42 50)
  else if (hex.startsWith('52494646')) {
    const webpHex = file.buffer.toString('hex', 8, 12).toLowerCase();
    if (webpHex === '57454250') isValidSignature = true;
  }

  if (!isValidSignature) {
    logger.warn(`[Malicious Upload Blocked] IP: ${req.ip} uploaded file with spoofed signature. Mismatch detected.`);
    res.status(400).json({ error: 'Security alert: Spoofed file signature detected.' });
    return;
  }

  next();
};
