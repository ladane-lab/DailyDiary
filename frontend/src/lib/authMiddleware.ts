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
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}
