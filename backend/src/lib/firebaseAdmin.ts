import admin from 'firebase-admin';
import { logger } from './logger.js';

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('[Firebase Admin] Initialized with service account.');
    } catch (error) {
      logger.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT', { error });
    }
  } else {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'dailydiary-f2cc6'
    });
    logger.info('[Firebase Admin] Initialized with default project ID.');
  }
}

export { admin };
