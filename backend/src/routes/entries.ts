import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { checkAndAwardBadges } from '../services/badges.js';
import crypto from 'crypto';

const router = Router();

// Encryption helpers using AES-256-GCM
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-me-32chars!!';

function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

function decrypt(encryptedText: string, ivHex: string): string {
  const [encrypted, authTag] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
  let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// POST /api/entries - Create a new diary entry
router.post('/', async (req: AuthRequest, res: Response) => {
  const { templateId, body, isPublic, responses, images, theme } = req.body;
  const userId = req.user!.uid;

  if (!body || body.trim().length === 0) {
    console.warn(`[API] Blank entry submission attempt by user: ${userId}`);
    res.status(400).json({ error: 'Journal content is required' });
    return;
  }

  console.log(`[API] Creating entry for user: ${userId} | Template: ${templateId || 'None'}`);

  try {
    // Ensure user exists in DB to prevent foreign key constraint errors
    // Identity Migration Logic: Ensure we use the stable UID and clear conflicting legacy records
    const currentEmail = req.user?.email || 'unknown@example.com';
    const existingUserByEmail = await prisma.user.findUnique({ where: { email: currentEmail } });

    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      console.log(`[API] Identity mismatch detected for ${currentEmail}. Starting full migration...`);
      try {
        await prisma.$transaction([
          prisma.entryResponse.deleteMany({ where: { entry: { userId: existingUserByEmail.id } } }),
          prisma.image.deleteMany({ where: { entry: { userId: existingUserByEmail.id } } }),
          prisma.tracker.deleteMany({ where: { userId: existingUserByEmail.id } }),
          prisma.entry.deleteMany({ where: { userId: existingUserByEmail.id } }),
          prisma.userBadge.deleteMany({ where: { userId: existingUserByEmail.id } }),
          prisma.userChallenge.deleteMany({ where: { userId: existingUserByEmail.id } }),
          prisma.user.delete({ where: { id: existingUserByEmail.id } }),
        ]);
        console.log(`[API] Migration complete for ${currentEmail}. Legacy record ${existingUserByEmail.id} purged.`);
      } catch (migrationError) {
        console.error(`[API] Migration failed during transaction!`, migrationError);
        // Continue anyway, upsert might still work if it wasn't a constraint issue
      }
    }

    // Now upsert/create with the stable UID
    console.log(`[API] Ensuring user document for UID: ${userId}`);
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: currentEmail }, // Keep email synced
      create: {
        id: userId,
        email: currentEmail,
        name: (req.user as any)?.name || currentEmail.split('@')[0] || 'Writer',
      },
    });

    // Validate templateId — fallback local IDs (e.g. "personal") are not real DB UUIDs
    let resolvedTemplateId: string | null = templateId || null;
    if (resolvedTemplateId) {
      const templateExists = await prisma.template.findUnique({ where: { id: resolvedTemplateId } });
      if (!templateExists) {
        console.warn(`[API] templateId "${resolvedTemplateId}" not found in DB — saving entry without template link.`);
        resolvedTemplateId = null;
      }
    }

    // Encrypt the entry body
    const { encrypted, iv } = encrypt(body);

    const entry = await prisma.entry.create({
      data: {
        userId,
        templateId: resolvedTemplateId,
        body_encrypted: encrypted,
        iv,
        isPublic: isPublic || false,
        theme: theme || 'marble',
        responses: responses
          ? {
              create: responses.map((r: { fieldLabel: string; value: string }) => ({
                fieldLabel: r.fieldLabel,
                value: r.value,
              })),
            }
          : undefined,
        images: images && images.length > 0
          ? {
              create: images.map((url: string) => ({ url }))
            }
          : undefined,
      },
      include: { responses: true, template: true, images: true },
    });

    // Update streak (Non-critical)
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStreak = 1;
        if (user.lastEntryDate) {
          const lastDate = new Date(user.lastEntryDate);
          lastDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak = user.streakCount + 1;
          } else if (diffDays === 0) {
            newStreak = user.streakCount; // Same day, keep streak
          }
          // diffDays > 1 → streak resets to 1
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            streakCount: newStreak,
            lastEntryDate: new Date(),
          },
        });
      }
    } catch (streakErr) {
      console.error(`[POST /entries] Streak update failed:`, streakErr);
    }

    // Auto-progress active challenges (Non-critical)
    try {
      const activeChallenges = await prisma.userChallenge.findMany({
        where: { userId, completed: false },
        include: { challenge: true },
      });

      for (const uc of activeChallenges) {
        const newDay = uc.currentDay + 1;
        const completed = newDay >= uc.challenge.duration;
        await prisma.userChallenge.update({
          where: { id: uc.id },
          data: { currentDay: newDay, completed },
        });
      }
    } catch (challengeErr) {
      console.error(`[POST /entries] Challenge progress failed:`, challengeErr);
    }

    // Award any newly earned badges
    console.log(`[POST /entries] Awarding badges...`);
    let newBadges: string[] = [];
    try {
      newBadges = await checkAndAwardBadges(userId);
    } catch (badgeErr) {
      console.error(`[POST /entries] Badge awarding failed (non-critical):`, badgeErr);
    }

    console.log(`[POST /entries] Entry fully processed: ${entry.id}`);
    res.status(201).json({ ...entry, body: '(encrypted)', newBadges });
  } catch (error: any) {
    console.error(`[POST /entries] FATAL ERROR for user ${userId}:`, error);
    res.status(500).json({ 
      error: `Save failed: ${error.message || "Unknown error"}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/entries - List user's entries
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const { page = '1', limit = '10' } = req.query;

  try {
    const entries = await prisma.entry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
      include: { template: true, responses: true },
    });

    // Decrypt bodies for the owner
    const decryptedEntries = entries.map((entry: any) => ({
      ...entry,
      body: decrypt(entry.body_encrypted, entry.iv),
      body_encrypted: undefined,
      iv: undefined,
    }));

    const total = await prisma.entry.count({ where: { userId } });

    res.json({ entries: decryptedEntries, total, page: parseInt(page as string) });
  } catch (error) {
    console.error('List entries error:', error);
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

// GET /api/entries/public - Public feed
router.get('/public', async (_req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.entry.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } }, template: true },
    });

    // For public entries, decrypt and show
    const publicEntries = entries.map((entry: any) => ({
      ...entry,
      body: decrypt(entry.body_encrypted, entry.iv),
      body_encrypted: undefined,
      iv: undefined,
    }));

    res.json(publicEntries);
  } catch (error) {
    console.error('Public entries error:', error);
    res.status(500).json({ error: 'Failed to fetch public entries' });
  }
});

// GET /api/entries/:id - Single entry
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const id = req.params.id as string;

  try {
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: { template: true, responses: true, images: true },
    });

    if (!entry) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    if (entry.userId !== userId && !entry.isPublic) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      ...entry,
      body: decrypt(entry.body_encrypted, entry.iv),
      body_encrypted: undefined,
      iv: undefined,
    });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// DELETE /api/entries/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const id = req.params.id as string;

  try {
    const entry = await prisma.entry.findUnique({ where: { id } });

    if (!entry || entry.userId !== userId) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    await prisma.entryResponse.deleteMany({ where: { entryId: id } });
    await prisma.image.deleteMany({ where: { entryId: id } });
    await prisma.entry.delete({ where: { id } });

    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
