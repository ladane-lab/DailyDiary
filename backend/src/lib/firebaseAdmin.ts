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
    logger.info('[Firebase Admin] No FIREBASE_SERVICE_ACCOUNT found. Skipping init (ok for local dev).');
  }
}

export { admin };
