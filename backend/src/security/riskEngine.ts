import { Request, Response } from 'express';
import { SECURITY_CONFIG } from '../config/securityConfig.js';
import redisService from '../services/redisService.js';
import { isHoneypotTriggered } from './honeypot.js';
import { verifyDeviceFingerprint } from './fingerprint.js';
import logger from '../lib/logger.js';
import { logSecurityEvent } from './auditLogger.js';

// Common bots and crawler signatures in User-Agent
const BOT_UA_REGEX = /bot|crawler|spider|curl|wget|python|postman|insomnia|headless|scrape|slurp|screenshot|guzzle/i;

interface RiskResult {
  score: number;
  reasons: string[];
}

/**
 * Computes a request risk score (0-100) based on multiple behavioral indicators.
 */
export async function calculateRiskScore(req: Request): Promise<RiskResult> {
  let score = 0;
  const reasons: string[] = [];
  const weights = SECURITY_CONFIG.riskScore.weights;

  // 1. Honeypot check
  if (isHoneypotTriggered(req)) {
    score += weights.honeypotFilled; // +40
    reasons.push('Honeypot field filled');
  }

  // 2. User-Agent analysis
  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent) {
    score += weights.invalidSuspiciousHeaders; // +20
    reasons.push('Missing User-Agent header');
  } else if (BOT_UA_REGEX.test(userAgent)) {
    score += weights.botUserAgent; // +40
    reasons.push('Bot User-Agent detected');
  }

  // 3. Header completeness check
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.headers.origin) {
    score += weights.invalidSuspiciousHeaders; // +20
    reasons.push('Missing Origin header on write request');
  }

  // 4. Device fingerprint check (only if user is logged in)
  const authReq = req as any;
  if (authReq.user?.uid) {
    const fingerprint = (req.headers['x-device-fingerprint'] || req.body.deviceFingerprint) as string;
    const fpResult = await verifyDeviceFingerprint(authReq.user.uid, fingerprint);
    if (!fpResult.isTrusted) {
      score += fpResult.riskScoreModifier; // +20
      reasons.push('Unknown device fingerprint');
    }
  }

  // 5. Fast repeated requests check (Redis-backed window)
  const fastKey = `rate:fast:${req.ip}`;
  const fastResult = await redisService.isRateLimited(fastKey, 5, 2000); // Max 5 requests in 2 seconds
  if (fastResult.limited) {
    score += weights.fastRepeatedRequests; // +20
    reasons.push('High frequency rapid requests');
  }

  // 6. Bad IP reputation check (Redis-backed warning list)
  const repKey = `reputation:bad:${req.ip}`;
  const hasBadReputation = await redisService.get(repKey);
  if (hasBadReputation) {
    score += weights.badIpHistory; // +30
    reasons.push('IP has bad reputation history');
  }

  // Clamp score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  return { score, reasons };
}

/**
 * Verifies a Cloudflare Turnstile token.
 */
async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = SECURITY_CONFIG.turnstile.secretKey;
  const verifyUrl = SECURITY_CONFIG.turnstile.verifyUrl;

  if (!secretKey) {
    logger.error('[Turnstile] Missing CLOUDFLARE_TURNSTILE_SECRET_KEY in production!');
    return false;
  }

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(ip)}`,
    });

    const data = await response.json() as any;
    return !!data.success;
  } catch (err) {
    logger.error('[Turnstile] Token verification request failed', err);
    return false;
  }
}

/**
 * Enforces the appropriate security policy based on the request's risk score.
 * Returns true if request should proceed, false if it was rejected/delayed/challenged.
 */
export async function enforceRiskPolicy(
  req: Request,
  res: Response,
  score: number,
  reasons: string[]
): Promise<boolean> {
  const thresholds = SECURITY_CONFIG.riskScore.thresholds;
  const ip = req.ip || '0.0.0.0';

  // 1. BLOCK: Risk 81 - 100
  if (score > thresholds.turnstileMax) {
    await logSecurityEvent({
      ip,
      endpoint: req.originalUrl,
      eventType: 'BLOCKED',
      reason: `Blocked by Risk Engine. Reasons: ${reasons.join(', ')}`,
      riskScore: score,
      req,
    });
    
    // Flag this IP as bad in Redis for 1 hour to prevent resource waste
    await redisService.set(`reputation:bad:${ip}`, 'blocked', 3600);

    res.status(403).json({
      error: 'Access denied. Suspicious activity detected.',
      reasons: process.env.NODE_ENV === 'production' ? undefined : reasons
    });
    return false;
  }

  // 2. SHOW TURNSTILE: Risk 61 - 80
  if (score > thresholds.delayMax) {
    const token = req.headers['x-turnstile-token'] as string;
    
    if (!token) {
      await logSecurityEvent({
        ip,
        endpoint: req.originalUrl,
        eventType: 'CHALLENGE_REQUIRED',
        reason: `Turnstile token required. Reasons: ${reasons.join(', ')}`,
        riskScore: score,
        req,
      });

      res.status(400).json({
        error: 'Security challenge verification required.',
        turnstileRequired: true,
      });
      return false;
    }

    const isValid = await verifyTurnstileToken(token, ip);
    if (!isValid) {
      await logSecurityEvent({
        ip,
        endpoint: req.originalUrl,
        eventType: 'CHALLENGE_FAILED',
        reason: 'Turnstile verification failed',
        riskScore: score,
        req,
      });

      res.status(400).json({
        error: 'Security challenge failed. Please try again.',
      });
      return false;
    }

    logger.info(`[Turnstile] Challenge solved successfully for IP: ${ip}`);
  }

  // 3. DELAY (Non-Blocking Cooldown): Risk 31 - 60
  if (score > thresholds.allowMax) {
    const delayKey = `cooldown:ip:${ip}`;
    
    // Check if the IP is currently in a cooldown state
    const isLockedOut = await redisService.get(delayKey);
    if (isLockedOut) {
      res.setHeader('Retry-After', '5');
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfterSeconds: 5
      });
      return false;
    }

    // Flag the cooldown in Redis for 5 seconds (non-blocking progressive delay)
    await redisService.set(delayKey, 'cooldown', 5);
    
    // Log the security event warning
    await logSecurityEvent({
      ip,
      endpoint: req.originalUrl,
      eventType: 'DELAYED',
      reason: `Progressive delay applied. Reasons: ${reasons.join(', ')}`,
      riskScore: score,
      req,
    });
  }

  return true;
}
