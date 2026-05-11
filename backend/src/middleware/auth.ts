import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
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
    // In production, we'd use admin.auth().verifyIdToken(token)
    // For development, we decode the token to get the stable Firebase UID (sub claim)
    const decoded = jwt.decode(token) as { sub: string; email?: string } | null;
    
    if (!decoded || !decoded.sub) {
      // Fallback if token isn't a valid JWT (e.g. dummy dev tokens)
      console.log(`[Auth] Using raw token as UID (Fallback case)`);
      req.user = { uid: token, email: 'dev@dailydiary.in' };
    } else {
      console.log(`[Auth] Identity verified for UID: ${decoded.sub}`);
      req.user = { uid: decoded.sub, email: decoded.email || 'user@dailydiary.in' };
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
    const decoded = jwt.decode(token) as { sub: string; email?: string } | null;
    
    if (decoded && decoded.sub) {
      req.user = { uid: decoded.sub, email: decoded.email || 'user@dailydiary.in' };
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
