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
  
  console.log(`[API] POST /entries | body length: ${body?.length} | images count: ${images?.length ?? 0} | isPublic: ${isPublic}`);
  if (images?.length > 0) console.log(`[API] Images to save:`, images);

  // Require body OR at least one image
  if ((!body || body.trim().length === 0) && (!images || images.length === 0)) {
    console.warn(`[API] Blank entry submission attempt by user: ${userId}`);
    res.status(400).json({ error: 'Journal content or an image is required' });
    return;
  }
  const safeBody = body || '';

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
    const { encrypted, iv } = encrypt(safeBody);

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
    const responseEntry = {
      ...entry,
      body: safeBody,
      body_encrypted: undefined,
      iv: undefined,
      isLiked: false,
      isBookmarked: false,
      isFollowing: false,
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      newBadges
    };
    res.status(201).json(responseEntry);
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
      include: { template: true, responses: true, images: true },
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
router.get('/public', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const entries = await prisma.entry.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { 
        user: { select: { name: true } }, 
        template: true,
        images: true,
        _count: {
          select: { likes: true, comments: true, bookmarks: true }
        },
        likes: {
          where: { userId: req.user?.uid || '' },
          select: { userId: true }
        },
        bookmarks: {
          where: { userId: req.user?.uid || '' },
          select: { userId: true }
        }
      },
    });

    if (entries.length === 0) {
      return res.json({ entries: [], total: 0 });
    }

    // Shuffle only if there's more than one entry and it's the first page
    // (Shuffling on later pages makes pagination inconsistent)
    let result = entries;
    if (entries.length > 1 && page === '1') {
      result = entries.sort(() => Math.random() - 0.5);
    }

    const publicEntries = result.map((entry: any) => ({
      ...entry,
      body: decrypt(entry.body_encrypted, entry.iv),
      body_encrypted: undefined,
      iv: undefined,
      isLiked: entry.likes.length > 0,
      isBookmarked: entry.bookmarks.length > 0,
      isFollowing: false, 
      likesCount: entry._count.likes,
      commentsCount: entry._count.comments,
      bookmarksCount: entry._count.bookmarks,
      likes: undefined,
      bookmarks: undefined,
      _count: undefined,
      user: { name: entry.user.name }
    }));

    const total = await prisma.entry.count({ where: { isPublic: true } });

    res.json({ 
      entries: publicEntries, 
      total, 
      page: parseInt(page as string),
      hasMore: total > skip + take
    });
  } catch (error) {
    console.error('Public entries error:', error);
    res.status(500).json({ error: 'Failed to fetch public entries' });
  }
});

// POST /api/entries/:id/like - Toggle Like
router.post('/:id/like', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;

  try {
    const existing = await prisma.like.findUnique({
      where: { userId_entryId: { userId, entryId } }
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_entryId: { userId, entryId } }
      });
      res.json({ liked: false });
    } else {
      await prisma.like.create({
        data: { userId, entryId }
      });
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/entries/:id/bookmark - Toggle Bookmark
router.post('/:id/bookmark', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;

  try {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_entryId: { userId, entryId } }
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { userId_entryId: { userId, entryId } }
      });
      res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({
        data: { userId, entryId }
      });
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// POST /api/entries/:id/comment - Add Comment
router.post('/:id/comment', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content required' });
  }

  try {
    const comment = await prisma.comment.create({
      data: { userId, entryId, content },
      include: { user: { select: { name: true } } }
    });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/entries/:id/comments - List Comments
router.get('/:id/comments', async (req: AuthRequest, res: Response) => {
  const entryId = req.params.id;

  try {
    const comments = await prisma.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
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

// PATCH /api/entries/:id - Update an entry
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const id = req.params.id;
  const { body, isPublic, theme, images } = req.body;

  try {
    const entry = await prisma.entry.findUnique({ 
      where: { id },
      include: { images: true }
    });

    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const updateData: any = {};
    if (body) {
      const { encrypted, iv } = encrypt(body);
      updateData.body_encrypted = encrypted;
      updateData.iv = iv;
    }
    if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;
    if (theme) updateData.theme = theme;

    // Append new images if provided
    if (images && images.length > 0) {
      updateData.images = {
        create: images.map((url: string) => ({ url }))
      };
    }

    const updated = await prisma.entry.update({
      where: { id },
      data: updateData,
      include: { images: true }
    });

    res.json({ 
      message: 'Entry updated', 
      id: updated.id,
      images: updated.images
    });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

export default router;
