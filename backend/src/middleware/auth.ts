import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { admin } from '../lib/firebaseAdmin.js';
import { logger } from '../lib/logger.js';

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

/**
 * JWT/Firebase Auth middleware.
 * Verifies the Firebase ID token and extracts user info.
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
    let decoded;
    const startAuth = performance.now();
    if (process.env.NODE_ENV === 'production') {
      const decodedToken = await admin.auth().verifyIdToken(token);
      decoded = { sub: decodedToken.uid, email: decodedToken.email, name: decodedToken.name, picture: decodedToken.picture };
    } else {
      decoded = jwt.decode(token) as { sub: string; email?: string; name?: string; picture?: string } | null;
    }
    console.log(`[AUTH MIDDLEWARE] Verification time: ${(performance.now() - startAuth).toFixed(2)}ms`);
    
    if (!decoded || !decoded.sub) {
      // Fallback if token isn't a valid JWT (e.g. dummy dev tokens)
      logger.info(`[Auth] Using raw token as UID (Fallback case)`);
      req.user = { uid: token, email: 'dev@dailydiary.in' };
    } else {
      logger.info(`[Auth] Identity verified for UID: ${decoded.sub}`);
      req.user = { 
        uid: decoded.sub, 
        email: decoded.email || 'user@dailydiary.in',
        name: decoded.name,
        picture: decoded.picture
      };
    }
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional Auth middleware.
 * If a token is provided, it attempts to verify it.
 * If no token is provided, it continues without error.
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    let decoded;
    if (process.env.NODE_ENV === 'production') {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        decoded = { sub: decodedToken.uid, email: decodedToken.email, name: decodedToken.name, picture: decodedToken.picture };
      } catch (err) {
        // failed to verify but it's optional
      }
    } else {
      decoded = jwt.decode(token) as { sub: string; email?: string; name?: string; picture?: string } | null;
    }
    
    if (decoded && decoded.sub) {
      req.user = { 
        uid: decoded.sub, 
        email: decoded.email || 'user@dailydiary.in',
        name: decoded.name,
        picture: decoded.picture
      };
    } else if (token) {
      // Fallback for dev tokens
      req.user = { uid: token, email: 'dev@dailydiary.in' };
    }
    next();
  } catch {
    // Silently continue if token is invalid but it was optional
    next();
  }
};
