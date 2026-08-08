import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../lib/logger.js';

// Helper to manually parse cookies from headers
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    const val = parts.join('=')?.trim();
    if (name) {
      try {
        list[name] = decodeURIComponent(val);
      } catch (err) {
        list[name] = val;
      }
    }
  });
  return list;
}

/**
 * CSRF Protection Middleware (Double Submit Cookie Pattern)
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Bypass CSRF checks for requests using Bearer token authentication
  // Custom headers (like Authorization: Bearer <token>) are not sent automatically by the browser,
  // making Bearer-token-protected endpoints naturally immune to CSRF.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  let csrfCookie = cookies['csrf-token'];

  // 2. Generate CSRF token cookie if not present
  if (!csrfCookie) {
    csrfCookie = crypto.randomBytes(24).toString('hex');
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `csrf-token=${csrfCookie}; Path=/; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=86400`
    );
  }

  // Expose token in custom header for SPA usage
  res.setHeader('X-CSRF-Token', csrfCookie);

  // 3. Bypass verification for safe HTTP methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // 4. Verify token for state-changing methods (POST, PUT, PATCH, DELETE)
  const headerToken = req.headers['x-csrf-token'] as string;

  if (!headerToken || !csrfCookie || headerToken !== csrfCookie) {
    logger.warn(`[CSRF Attack Blocked] IP: ${req.ip} | Method: ${req.method} | Path: ${req.originalUrl}`);
    res.status(403).json({ 
      error: 'Invalid or missing CSRF token. Cross-Origin request blocked.' 
    });
    return;
  }

  next();
};
