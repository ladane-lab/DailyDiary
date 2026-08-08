import redisService from '../services/redisService.js';
import prisma from '../lib/prisma.js';
import { SECURITY_CONFIG } from '../config/securityConfig.js';
import logger from '../lib/logger.js';

/**
 * Attack Detector & Adaptive Security Module
 */

/**
 * Registers a security anomaly (e.g., rate limit trigger, blocked request).
 * Increments global anomaly counters and transitions to HIGH_ALERT mode if thresholds are exceeded.
 */
export async function registerSecurityIncident(ip: string): Promise<void> {
  const now = Date.now();
  const windowMs = SECURITY_CONFIG.adaptiveMode.checkWindowSeconds * 1000; // 60s
  
  // 1. Increment this IP's anomaly index
  const ipAnomaliesKey = `anomalies:ip:${ip}`;
  const ipAnomalies = await redisService.isRateLimited(ipAnomaliesKey, 10, windowMs);
  if (ipAnomalies.limited) {
    // Ban the IP locally in Redis and DB
    await banIp(ip, 'Automated ban: Too many security anomalies triggered in 1 minute.');
    return;
  }

  // 2. Increment global incident rate (sliding window in Redis)
  const globalAlertKey = 'alert:global:incidents';
  const incidentRate = await redisService.isRateLimited(
    globalAlertKey,
    SECURITY_CONFIG.adaptiveMode.highAlertThreshold,
    windowMs
  );

  // If we exceed threshold, transition to HIGH_ALERT mode
  if (incidentRate.limited) {
    const alertLevel = await redisService.get('alert:level');
    if (alertLevel !== 'HIGH_ALERT') {
      await redisService.set(
        'alert:level',
        'HIGH_ALERT',
        SECURITY_CONFIG.adaptiveMode.cooldownPeriodMinutes * 60
      );
      logger.warn('[SECURITY ALERT] Global threat incident frequency has exceeded threshold! Transitioned to HIGH_ALERT mode.');
    }
  }
}

/**
 * Returns the current threat level of the system ('NORMAL' or 'HIGH_ALERT').
 */
export async function getAlertLevel(): Promise<'NORMAL' | 'HIGH_ALERT'> {
  const alert = await redisService.get('alert:level');
  return alert === 'HIGH_ALERT' ? 'HIGH_ALERT' : 'NORMAL';
}

/**
 * Check if an IP address is blocked.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const redisBanKey = `block:ip:${ip}`;
  
  // 1. Speed Check: Is it in Redis?
  const isBannedInRedis = await redisService.get(redisBanKey);
  if (isBannedInRedis) return true;

  // 2. Fallback check: Check Postgres for persistent bans
  try {
    const activeBan = await prisma.blockedIP.findFirst({
      where: {
        ip,
        expiresAt: { gt: new Date() }
      }
    });

    if (activeBan) {
      // Cache it back to Redis so we don't query Postgres on the next request
      const remainingSeconds = Math.max(1, Math.ceil((activeBan.expiresAt.getTime() - Date.now()) / 1000));
      await redisService.set(redisBanKey, 'banned', remainingSeconds);
      return true;
    }
  } catch (error) {
    // Fail-open on DB connection issues to avoid locking out users
    logger.debug(`[AttackDetector] BlockedIP DB check failed: ${error}`);
  }

  return false;
}

/**
 * Bans an IP persistently in PostgreSQL and caches it in Redis.
 */
export async function banIp(ip: string, reason: string): Promise<void> {
  const banDurationSeconds = SECURITY_CONFIG.adaptiveMode.ipBanDurationSeconds; // 1 hour (3600s)
  const expiresAt = new Date(Date.now() + banDurationSeconds * 1000);
  
  logger.warn(`[IP BAN] IP: ${ip} has been blocked for 1 hour. Reason: ${reason}`);

  // Cache in Redis for high-speed checks
  await redisService.set(`block:ip:${ip}`, 'banned', banDurationSeconds);

  // Record persistently in PostgreSQL for audits
  prisma.blockedIP.upsert({
    where: { ip },
    update: { reason, blockedAt: new Date(), expiresAt },
    create: { ip, reason, expiresAt }
  }).catch(err => {
    logger.debug(`[AttackDetector] Failed to record IP ban in DB: ${err.message}`);
  });
}
