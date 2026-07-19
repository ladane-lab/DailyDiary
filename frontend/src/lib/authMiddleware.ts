import { NextRequest } from 'next/server';
import { admin } from './firebaseAdmin';

export interface DecodedUser {
  uid: string;
  email?: string;
  name?: string;
}

export async function verifyToken(req: NextRequest): Promise<DecodedUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    if (process.env.NODE_ENV === 'production') {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
      };
    } else {
      // Development fallback: decode JWT without signature verification
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return { uid: token };
      
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      return {
        uid: payload.sub || payload.user_id,
        email: payload.email,
        name: payload.name,
      };
    }
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}
