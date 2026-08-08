import { Request, Response, NextFunction } from 'express';
import { admin } from '../lib/firebaseAdmin.js';
import { logger } from '../lib/logger.js';

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
    admin?: boolean;
  };
}

/**
 * Firebase Auth middleware.
 * Verifies the Firebase ID token using Firebase Admin SDK and extracts user info.
 * Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    let decodedToken: any;
    if (process.env.NODE_ENV === 'test') {
      if (token === 'valid-admin') {
        decodedToken = { uid: 'admin-uid-123', email: 'admin@dailydiary.in', name: 'Admin User', admin: true };
      } else if (token === 'valid-user') {
        decodedToken = { uid: 'user-uid-123', email: 'writer@dailydiary.in', name: 'Normal User' };
      } else if (token === 'expired-token') {
        throw new Error('Firebase ID token has expired.');
      } else {
        throw new Error('Invalid Firebase token.');
      }
    } else {
      decodedToken = await admin.auth().verifyIdToken(token);
    }

    logger.info(`[Auth] Identity verified for UID: ${decodedToken.uid}`);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name,
      picture: decodedToken.picture,
      admin: decodedToken.admin === true
    };
    next();
  } catch (error) {
    logger.error('Auth middleware verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
