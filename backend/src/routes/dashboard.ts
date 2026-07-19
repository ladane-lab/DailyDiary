import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import crypto from 'crypto';

const router = Router();

// Encryption helpers using AES-256-GCM
const ENCRYPTION_KEY = process.env.DIARY_ENCRYPTION_KEY || process.env.JWT_SECRET as string;
const CACHED_PRIMARY_KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

let CACHED_FALLBACK_KEY_1: Buffer | null = null;
if (process.env.JWT_SECRET && process.env.JWT_SECRET !== ENCRYPTION_KEY) {
  CACHED_FALLBACK_KEY_1 = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
}

const DEFAULT_KEY_STRING = 'default-key-change-me-32chars!!';
let CACHED_FALLBACK_KEY_2: Buffer | null = null;
if (DEFAULT_KEY_STRING !== ENCRYPTION_KEY && DEFAULT_KEY_STRING !== process.env.JWT_SECRET) {
  CACHED_FALLBACK_KEY_2 = crypto.scryptSync(DEFAULT_KEY_STRING, 'salt', 32);
}

function attemptDecrypt(encrypted: string, authTag: string, iv: Buffer, key: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decrypt(encryptedText: string, ivHex: string): string {
  const [encrypted, authTag] = encryptedText.split(':');
  if (!encrypted || !authTag) throw new Error('Invalid encrypted text format');
  const iv = Buffer.from(ivHex, 'hex');

  try {
    return attemptDecrypt(encrypted, authTag, iv, CACHED_PRIMARY_KEY);
  } catch (err) {
    if (CACHED_FALLBACK_KEY_1) {
      try { return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_1); } catch (e) {}
    }
    if (CACHED_FALLBACK_KEY_2) {
      try { return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_2); } catch (e) {}
    }
    throw err;
  }
}

// GET /api/dashboard/init - Fetch all dashboard data concurrently
router.get('/init', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    const [user, entries, challenges, totalEntries, totalBadges] = await Promise.all([
      // 1. User Profile & Streak
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, streakCount: true, lastEntryDate: true, createdAt: true, photoURL: true }
      }),
      // 2. Recent Entries (Limit 5)
      prisma.entry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          body_encrypted: true,
          iv: true,
          createdAt: true,
          theme: true,
          templateId: true,
          template: {
            select: { name: true }
          }
        }
      }),
      // 3. Active Challenges
      prisma.userChallenge.findMany({
        where: { userId, completed: false },
        include: { challenge: true }
      }),
      // 4. Total Entry Count
      prisma.entry.count({ where: { userId } }),
      // 5. Total Badges Count
      prisma.userBadge.count({ where: { userId } })
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Decrypt the entries
    const decryptedEntries = entries.map((entry) => {
      try {
        const decryptedBody = decrypt(entry.body_encrypted, entry.iv);
        return { ...entry, body: decryptedBody, body_encrypted: undefined, iv: undefined };
      } catch (decErr) {
        logger.error(`Failed to decrypt entry ${entry.id}`, decErr);
        return { ...entry, body: '⚠️ Content unavailable due to decryption error', body_encrypted: undefined, iv: undefined };
      }
    });

    res.json({
      user,
      stats: {
        totalEntries,
        activeChallengesCount: challenges.length,
        badgesEarned: totalBadges,
      },
      recentEntries: decryptedEntries,
      activeChallenges: challenges
    });
  } catch (error) {
    logger.error('Dashboard init error', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
