import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import logger from '../lib/logger.js';

/**
 * Middleware to authorize administrators for security-sensitive operations.
 * Checks for the Firebase 'admin' custom claim or matches user email against the ADMIN_EMAILS environment variable.
 */
export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication token required.' });
    return;
  }

  const userEmail = (req.user.email || '').trim().toLowerCase();
  
  // 1. Check custom claim from token
  let isAdmin = req.user.admin === true;

  // 2. Check ADMIN_EMAILS configuration
  if (!isAdmin && process.env.ADMIN_EMAILS && userEmail) {
    const adminEmails = process.env.ADMIN_EMAILS.split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
      
    isAdmin = adminEmails.includes(userEmail);
  }

  if (!isAdmin) {
    logger.warn(`[Admin Blocked] Unauthorized access attempt to admin API: ${userEmail} (UID: ${req.user.uid})`);
    res.status(403).json({ error: 'Forbidden: Admin access only.' });
    return;
  }

  next();
};

export default authorizeAdmin;
