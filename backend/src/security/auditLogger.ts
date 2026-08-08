import { Request } from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

interface LogEventOptions {
  ip: string;
  endpoint: string;
  eventType: string;
  reason?: string;
  riskScore: number;
  req: Request;
}

// Simple browser detection from User-Agent string to avoid heavy parser packages
function getBrowserInfo(ua?: string): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/') && !ua.includes('Chromium/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Edge/') || ua.includes('Edg/')) return 'Edge';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';
  if (/bot|crawler|spider/i.test(ua)) return 'Bot/Crawler';
  return 'Other';
}

/**
 * Non-blocking logger that saves security events to the database in the background 
 * and outputs structured logs. Never blocks the Express request pipeline.
 */
export async function logSecurityEvent(options: LogEventOptions): Promise<void> {
  const { ip, endpoint, eventType, reason, riskScore, req } = options;
  const userAgent = req.headers['user-agent'] as string || '';
  const browser = getBrowserInfo(userAgent);
  
  // Detect country using Cloudflare Free Edge headers or other common proxy headers
  const country = (req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'Unknown') as string;

  // 1. Output structured JSON log to stdout/stderr (meets Pino/Winston requirements)
  const logData = {
    timestamp: new Date().toISOString(),
    ip,
    country,
    browser,
    endpoint,
    eventType,
    reason,
    riskScore,
  };

  if (riskScore >= 70 || eventType === 'BLOCKED') {
    logger.warn(`[SECURITY WARN] ${reason}`, logData);
  } else {
    logger.info(`[SECURITY AUDIT] ${eventType} for ${endpoint}`, logData);
  }

  // 2. Database Insert (Execute asynchronously without awaiting to ensure minimal response latency)
  prisma.securityEvent.create({
    data: {
      ip,
      country,
      browser,
      endpoint,
      eventType,
      reason: reason || null,
      riskScore,
    }
  }).catch(err => {
    // Only warn on connection loss; do not crash the app
    logger.debug(`[AuditLogger] Failed to write audit event to DB: ${err.message}`);
  });
}
