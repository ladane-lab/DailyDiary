import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest, authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { checkAndAwardBadges } from '../services/badges.js';
import crypto from 'crypto';
import logger from '../lib/logger.js';

const router = Router();

// Encryption helpers using AES-256-GCM
const ENCRYPTION_KEY = process.env.DIARY_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me-32chars!!';

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

  // 1. Try with the primary ENCRYPTION_KEY
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
    let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // 2. Fallback to JWT_SECRET if it was defined and is different
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== ENCRYPTION_KEY) {
      try {
        const fallbackKey = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv);
        decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
        let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (fallbackErr) {}
    }

    // 3. Fallback to default hardcoded key if both were different
    const defaultKey = 'default-key-change-me-32chars!!';
    if (defaultKey !== ENCRYPTION_KEY && defaultKey !== process.env.JWT_SECRET) {
      try {
        const defKey = crypto.scryptSync(defaultKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', defKey, iv);
        decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
        let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (defErr) {}
    }

    // If all failed, rethrow the original error
    throw err;
  }
}


// POST /api/entries - Create a new diary entry
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { templateId, body, isPublic, responses, images, theme } = req.body;
  const userId = req.user!.uid;
  
  logger.info(`POST /entries`, { bodyLength: body?.length, imagesCount: images?.length ?? 0, isPublic });

  // Require body OR at least one image
  if ((!body || body.trim().length === 0) && (!images || images.length === 0)) {
    logger.warn(`Blank entry submission attempt by user`, { userId });
    res.status(400).json({ error: 'Journal content or an image is required' });
    return;
  }
  const safeBody = body || '';

  logger.info(`Creating entry for user`, { userId, templateId: templateId || 'None' });

  try {
    const currentEmail = req.user?.email || 'unknown@example.com';
    const existingUserByEmail = await prisma.user.findUnique({ where: { email: currentEmail } });

    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      logger.info(`Identity mismatch detected for ${currentEmail}. Starting migration...`);
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
      } catch (err) {
        logger.error(`Migration failed`, err, { email: currentEmail });
      }
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: { email: currentEmail },
      create: {
        id: userId,
        email: currentEmail,
        name: (req.user as any)?.name || currentEmail.split('@')[0] || 'Writer',
      },
    });

    let resolvedTemplateId: string | null = templateId || null;
    if (resolvedTemplateId) {
      const templateExists = await prisma.template.findUnique({ where: { id: resolvedTemplateId } });
      if (!templateExists) resolvedTemplateId = null;
    }

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

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newStreak = 1;
        let isNewDay = true;
        if (user.lastEntryDate) {
          const lastDate = new Date(user.lastEntryDate);
          lastDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak = user.streakCount + 1;
            isNewDay = true;
          } else if (diffDays === 0) {
            newStreak = user.streakCount;
            isNewDay = false;
          } else {
            newStreak = 1;
            isNewDay = true;
          }
        }
        await prisma.user.update({
          where: { id: userId },
          data: { streakCount: newStreak, lastEntryDate: new Date() },
        });

        // Progress all active user challenges on a new calendar day post
        if (isNewDay) {
          const activeChallenges = await prisma.userChallenge.findMany({
            where: { userId, completed: false },
            include: { challenge: true }
          });
          for (const uc of activeChallenges) {
            const nextDay = uc.currentDay + 1;
            const completed = nextDay >= uc.challenge.duration;
            await prisma.userChallenge.update({
              where: { id: uc.id },
              data: { currentDay: nextDay, completed }
            });
          }
        }
      }
    } catch (err) {
      logger.error("Challenge/Streak progression failed", err, { userId });
    }

    let newBadges: string[] = [];
    try {
      newBadges = await checkAndAwardBadges(userId);
    } catch (err) {}

    res.status(201).json({
      ...entry,
      body: safeBody,
      body_encrypted: undefined,
      iv: undefined,
      isLiked: false,
      isBookmarked: false,
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      newBadges
    });
  } catch (error: any) {
    logger.error(`Error creating entry`, error, { userId });
    res.status(500).json({ error: `Save failed: ${error.message}` });
  }
});

// GET /api/entries/public - Social-media-style feed with ranking algorithm
router.get('/public', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string);
  const take = parseInt(limit as string);

  try {
    logger.info(`Fetching public feed`, { page, user: req.user?.uid || 'Guest' });

    // Fetch a larger pool to rank from (3x the page size for better shuffling)
    const poolSize = Math.min(take * 3, 50);
    const total = await prisma.entry.count({ where: { isPublic: true } });

    // For page 1: fetch a large pool and rank. For later pages: use offset with recency order.
    const isFirstPage = pageNum === 1;
    const fetchSize = isFirstPage ? poolSize : take;
    const skip = isFirstPage ? 0 : ((pageNum - 1) * take);

    const entries = await prisma.entry.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: fetchSize,
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            photoURL: true,
            followers: {
              where: { followerId: req.user?.uid || '' },
              select: { followerId: true }
            }
          }
        }, 
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
      logger.info(`No public entries found`);
      return res.json({ entries: [], total: 0, page: pageNum, hasMore: false });
    }

    // ── Social-media feed ranking algorithm ──
    // Score = recencyScore * (1 + engagementBoost) + followBoost + randomFactor
    const now = Date.now();
    const HOUR = 3600_000;
    const scoredEntries = entries.map((entry: any) => {
      const ageHours = (now - new Date(entry.createdAt).getTime()) / HOUR;
      
      // Recency: exponential decay — entries < 6h get ~1.0, 24h gets ~0.7, 72h gets ~0.35
      const recencyScore = Math.exp(-ageHours / 48);
      
      // Engagement: logarithmic boost from likes, comments, bookmarks
      const totalEngagement = entry._count.likes + (entry._count.comments * 2) + entry._count.bookmarks;
      const engagementBoost = Math.log2(1 + totalEngagement) * 0.15;
      
      // Following boost: entries from people the user follows get a bump
      const followBoost = (entry.user.followers && entry.user.followers.length > 0) ? 0.2 : 0;
      
      // Small random factor to prevent identical feeds on every refresh
      const randomFactor = Math.random() * 0.1;
      
      const score = recencyScore * (1 + engagementBoost) + followBoost + randomFactor;
      
      return { entry, score };
    });

    // Sort by score descending, then take only the page size
    scoredEntries.sort((a, b) => b.score - a.score);
    const rankedEntries = isFirstPage 
      ? scoredEntries.slice(0, take) 
      : scoredEntries;

    const publicEntries = rankedEntries.map(({ entry }: any) => {
      let decryptedBody = "[Secure Content]";
      try {
        decryptedBody = decrypt(entry.body_encrypted, entry.iv);
      } catch (err) {
        logger.error(`Decryption failed for entry`, err, { entryId: entry.id });
      }
      
      return {
        ...entry,
        body: decryptedBody,
        body_encrypted: undefined,
        iv: undefined,
        isLiked: entry.likes.length > 0,
        isBookmarked: entry.bookmarks.length > 0,
        isFollowing: entry.user.followers && entry.user.followers.length > 0,
        likesCount: entry._count.likes,
        commentsCount: entry._count.comments,
        bookmarksCount: entry._count.bookmarks,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
        user: { 
          name: entry.user.name,
          photoURL: entry.user.photoURL || null
        }
      };
    });

    res.json({ 
      entries: publicEntries, 
      total, 
      page: pageNum,
      hasMore: total > skip + take
    });
  } catch (error: any) {
    logger.error('Public entries error', error);
    res.status(500).json({ error: 'Failed to fetch public entries', details: error.message });
  }
});

// GET /api/entries/my-public - Current user's public posts with full social data
router.get('/my-public', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const take = parseInt(limit as string);
  const skip = (pageNum - 1) * take;

  try {
    logger.info(`Fetching user's public posts`, { userId });

    const total = await prisma.entry.count({ where: { userId, isPublic: true } });

    const entries = await prisma.entry.findMany({
      where: { userId, isPublic: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoURL: true,
          }
        },
        template: true,
        images: true,
        _count: {
          select: { likes: true, comments: true, bookmarks: true }
        },
        likes: {
          where: { userId },
          select: { userId: true }
        },
        bookmarks: {
          where: { userId },
          select: { userId: true }
        }
      },
    });

    const publicEntries = entries.map((entry: any) => {
      let decryptedBody = "[Secure Content]";
      try {
        decryptedBody = decrypt(entry.body_encrypted, entry.iv);
      } catch (err) {
        logger.error(`Decryption failed for entry`, err, { entryId: entry.id });
      }

      return {
        ...entry,
        body: decryptedBody,
        body_encrypted: undefined,
        iv: undefined,
        isLiked: entry.likes.length > 0,
        isBookmarked: entry.bookmarks.length > 0,
        isFollowing: false, // Own posts - not applicable
        likesCount: entry._count.likes,
        commentsCount: entry._count.comments,
        bookmarksCount: entry._count.bookmarks,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
        user: {
          name: entry.user.name,
          photoURL: entry.user.photoURL || null
        }
      };
    });

    res.json({
      entries: publicEntries,
      total,
      page: pageNum,
      hasMore: total > skip + take
    });
  } catch (error: any) {
    logger.error('User public entries error', error);
    res.status(500).json({ error: 'Failed to fetch user public entries', details: error.message });
  }
});

// GET /api/entries - List user's entries
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const { page = '1', limit = '10', search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const whereClause: any = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      whereClause.OR = [
        {
          template: {
            name: { contains: q, mode: 'insensitive' }
          }
        },
        {
          responses: {
            some: {
              OR: [
                { fieldLabel: { contains: q, mode: 'insensitive' } },
                { value: { contains: q, mode: 'insensitive' } }
              ]
            }
          }
        }
      ];
    }

    const entries = await prisma.entry.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { template: true, responses: true, images: true },
    });

    const decryptedEntries = entries.map((entry: any) => {
      let body = "[Secure Content]";
      try {
        body = decrypt(entry.body_encrypted, entry.iv);
      } catch (err) {}
      return {
        ...entry,
        body,
        body_encrypted: undefined,
        iv: undefined,
      };
    });

    const total = await prisma.entry.count({ where: whereClause });
    res.json({ entries: decryptedEntries, total, page: parseInt(page as string) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

// POST /api/entries/:id/like - Toggle Like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id as string;
  try {
    const existing = await prisma.like.findUnique({ where: { userId_entryId: { userId, entryId } } });
    if (existing) {
      await prisma.like.delete({ where: { userId_entryId: { userId, entryId } } });
      res.json({ liked: false });
    } else {
      await prisma.like.create({ data: { userId, entryId } });
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/entries/:id/bookmark - Toggle Bookmark
router.post('/:id/bookmark', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id as string;
  try {
    const existing = await prisma.bookmark.findUnique({ where: { userId_entryId: { userId, entryId } } });
    if (existing) {
      await prisma.bookmark.delete({ where: { userId_entryId: { userId, entryId } } });
      res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId, entryId } });
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// POST /api/entries/:id/comment - Add Comment
router.post('/:id/comment', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id as string;
  const { content } = req.body;
  if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Comment required' });
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
  try {
    const comments = await prisma.comment.findMany({
      where: { entryId: req.params.id as string },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/entries/saved - List bookmarked entries
router.get('/saved', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const { page = '1', limit = '10' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        entry: {
          include: {
            user: { select: { id: true, name: true, photoURL: true } },
            template: true,
            images: true,
            _count: { select: { likes: true, comments: true, bookmarks: true } },
            likes: { where: { userId }, select: { userId: true } },
            bookmarks: { where: { userId }, select: { userId: true } }
          }
        }
      }
    });

    const total = await prisma.bookmark.count({ where: { userId } });

    const savedEntries = bookmarks.map((b: any) => {
      const entry = b.entry;
      let decryptedBody = "[Secure Content]";
      try {
        decryptedBody = decrypt(entry.body_encrypted, entry.iv);
      } catch (err) {}

      return {
        ...entry,
        body: decryptedBody,
        body_encrypted: undefined,
        iv: undefined,
        isLiked: entry.likes.length > 0,
        isBookmarked: entry.bookmarks.length > 0,
        likesCount: entry._count.likes,
        commentsCount: entry._count.comments,
        bookmarksCount: entry._count.bookmarks,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
      };
    });

    res.json({ entries: savedEntries, total, page: parseInt(page as string), hasMore: total > skip + take });
  } catch (error: any) {
    logger.error('Failed to get saved entries', error);
    res.status(500).json({ error: 'Failed to get saved entries' });
  }
});

// GET /api/entries/:id - Single entry
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;
  try {
    const entry = await prisma.entry.findUnique({
      where: { id: req.params.id as string },
      include: { template: true, responses: true, images: true },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (entry.userId !== userId && !entry.isPublic) return res.status(403).json({ error: 'Access denied' });
    res.json({
      ...entry,
      body: decrypt(entry.body_encrypted, entry.iv),
      body_encrypted: undefined,
      iv: undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// DELETE /api/entries/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id as string;
  try {
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (!entry || entry.userId !== userId) return res.status(404).json({ error: 'Entry not found' });
    await prisma.entryResponse.deleteMany({ where: { entryId } });
    await prisma.image.deleteMany({ where: { entryId } });
    await prisma.entry.delete({ where: { id: entryId } });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// PATCH /api/entries/:id - Update an entry
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const { body, isPublic, theme, images, responses } = req.body;
  const entryId = req.params.id as string;
  try {
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (!entry || entry.userId !== userId) return res.status(404).json({ error: 'Entry not found' });
    
    const updateData: any = {};
    if (body !== undefined) {
      const { encrypted, iv } = encrypt(body);
      updateData.body_encrypted = encrypted;
      updateData.iv = iv;
    }
    if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;
    if (theme) updateData.theme = theme;

    await prisma.$transaction(async (tx) => {
      if (responses) {
        await tx.entryResponse.deleteMany({ where: { entryId } });
        updateData.responses = {
          create: responses.map((r: { fieldLabel: string; value: string }) => ({
            fieldLabel: r.fieldLabel,
            value: r.value,
          })),
        };
      }
      if (images) {
        await tx.image.deleteMany({ where: { entryId } });
        updateData.images = {
          create: images.map((url: string) => ({ url })),
        };
      }

      await tx.entry.update({
        where: { id: entryId },
        data: updateData,
      });
    });

    res.json({ message: 'Entry updated successfully', id: entryId });
  } catch (error: any) {
    logger.error('Failed to update entry', error, { entryId, userId });
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

export default router;
