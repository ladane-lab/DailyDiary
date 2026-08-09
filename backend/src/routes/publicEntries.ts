import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { validateParams, idParamSchema } from '../security/validation.js';
import crypto from 'crypto';

const router = Router();

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
  if (!ivHex) return encryptedText;
  const [encrypted, authTag] = encryptedText.split(':');
  if (!encrypted || !authTag) throw new Error('Invalid encrypted text format');
  const iv = Buffer.from(ivHex, 'hex');

  try {
    return attemptDecrypt(encrypted, authTag, iv, CACHED_PRIMARY_KEY);
  } catch (err) {
    if (CACHED_FALLBACK_KEY_1) {
      try {
        return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_1);
      } catch (fallbackErr) {}
    }
    if (CACHED_FALLBACK_KEY_2) {
      try {
        return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_2);
      } catch (defErr) {}
    }
    throw err;
  }
}

// GET /api/entries/public/:id - Single public entry (unauthenticated, for OG tags)
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const entry = await prisma.entry.findUnique({
      where: { id: req.params.id as string },
      include: { images: true, user: { select: { name: true } } },
    });
    if (!entry || !entry.isPublic) return res.status(404).json({ error: 'Entry not found' });
    
    let body = "[Secure Content]";
    try {
      body = decrypt(entry.body_encrypted, entry.iv);
    } catch (e) {}

    res.json({
      ...entry,
      body,
      body_encrypted: undefined,
      iv: undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

export default router;
