import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest, authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { checkAndAwardBadges } from '../services/badges.js';
import crypto from 'crypto';
import logger from '../lib/logger.js';
import { appCache } from '../lib/cache.js';

const router = Router();

// Encryption helpers using AES-256-GCM
const ENCRYPTION_KEY = process.env.DIARY_ENCRYPTION_KEY || process.env.JWT_SECRET as string;

// ─── Pre-derive Keys to Prevent Blocking the Event Loop (Performance Fix) ───
// crypto.scryptSync is intentionally slow. By caching the derived keys on module load,
// we reduce decryption time from 15 seconds to < 200ms for 20 entries.
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

function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  // Use pre-derived primary key
  const cipher = crypto.createCipheriv('aes-256-gcm', CACHED_PRIMARY_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
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

  // 1. Try with the cached primary ENCRYPTION_KEY
  try {
    return attemptDecrypt(encrypted, authTag, iv, CACHED_PRIMARY_KEY);
  } catch (err) {
    // 2. Fallback to cached JWT_SECRET key
    if (CACHED_FALLBACK_KEY_1) {
      try {
        return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_1);
      } catch (fallbackErr) {}
    }

    // 3. Fallback to cached default key
    if (CACHED_FALLBACK_KEY_2) {
      try {
        return attemptDecrypt(encrypted, authTag, iv, CACHED_FALLBACK_KEY_2);
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
      logger.warn(`Identity mismatch detected for ${currentEmail}. Manual review needed.`, { existingUserId: existingUserByEmail.id, newUserId: userId });
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
        const timezoneOffset = req.body.timezoneOffset ? parseInt(req.body.timezoneOffset, 10) : 0;
        const today = new Date();
        today.setMinutes(today.getMinutes() - timezoneOffset);
        today.setUTCHours(0, 0, 0, 0);
        let newStreak = 1;
        let isNewDay = true;
        if (user.lastEntryDate) {
          const lastDate = new Date(user.lastEntryDate);
          lastDate.setMinutes(lastDate.getMinutes() - timezoneOffset);
          lastDate.setUTCHours(0, 0, 0, 0);
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
          // Run all challenge updates concurrently instead of sequentially
          await Promise.all(activeChallenges.map(uc => {
            const nextDay = uc.currentDay + 1;
            const completed = nextDay >= uc.challenge.duration;
            return prisma.userChallenge.update({
              where: { id: uc.id },
              data: { currentDay: nextDay, completed }
            });
          }));
        }
      }
    } catch (err) {
      logger.error("Challenge/Streak progression failed", err, { userId });
    }

    let newBadges: string[] = [];
    try {
      newBadges = await checkAndAwardBadges(userId);
    } catch (err) {}

    if (entry.isPublic) {
      appCache.invalidatePrefix('public-feed-');
    }

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

    // For page 1: fetch a large pool and rank. For later pages: use offset with recency order.
    const isFirstPage = pageNum === 1;
    const fetchSize = isFirstPage ? poolSize : take;
    const skip = isFirstPage ? 0 : ((pageNum - 1) * take);

    const cacheKey = `public-feed-v1-page-${pageNum}`;

    const fetchGlobalFeed = async () => {
      const total = await prisma.entry.count({ where: { isPublic: true } });
      const dbEntries = await prisma.entry.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: fetchSize,
        select: {
          id: true,
          body_encrypted: true,
          iv: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              photoURL: true,
            }
          },
          images: {
            select: { id: true, url: true }
          },
          _count: {
            select: { likes: true, comments: true, bookmarks: true }
          }
        },
      });
      const decryptedEntries = dbEntries.map(entry => {
        let decryptedBody = "[Secure Content]";
        try {
          decryptedBody = decrypt(entry.body_encrypted, entry.iv);
        } catch (err) {
          logger.error(`Decryption failed for entry`, err, { entryId: entry.id });
        }
        return {
          id: entry.id,
          body: decryptedBody,
          createdAt: entry.createdAt,
          user: entry.user,
          images: entry.images,
          _count: entry._count,
        };
      });
      return { total, entries: decryptedEntries };
    };

    const { total, entries } = await appCache.getOrFetch(cacheKey, fetchGlobalFeed);

    if (entries.length === 0) {
      logger.info(`No public entries found`);
      return res.json({ entries: [], total: 0, page: pageNum, hasMore: false });
    }

    // ── Personalized Hydration ──
    const userLikes = new Set<string>();
    const userBookmarks = new Set<string>();
    const userFollowing = new Set<string>();

    if (req.user) {
      const entryIds = entries.map((e: any) => e.id);
      const userIds = [...new Set(entries.map((e: any) => e.user.id))];

      const [likes, bookmarks, follows] = await Promise.all([
        prisma.like.findMany({ where: { userId: req.user.uid, entryId: { in: entryIds } }, select: { entryId: true } }),
        prisma.bookmark.findMany({ where: { userId: req.user.uid, entryId: { in: entryIds } }, select: { entryId: true } }),
        prisma.follow.findMany({ where: { followerId: req.user.uid, followingId: { in: userIds } }, select: { followingId: true } })
      ]);

      likes.forEach(l => userLikes.add(l.entryId));
      bookmarks.forEach(b => userBookmarks.add(b.entryId));
      follows.forEach(f => userFollowing.add(f.followingId));
    }

    // ── Social-media feed ranking algorithm ──
    const now = Date.now();
    const HOUR = 3600_000;
    const scoredEntries = entries.map((entry: any) => {
      const ageHours = (now - new Date(entry.createdAt).getTime()) / HOUR;
      const recencyScore = Math.exp(-ageHours / 48);
      const totalEngagement = entry._count.likes + (entry._count.comments * 2) + entry._count.bookmarks;
      const engagementBoost = Math.log2(1 + totalEngagement) * 0.15;
      
      const followBoost = userFollowing.has(entry.user.id) ? 0.2 : 0;
      const randomFactor = Math.random() * 0.1;
      
      const score = recencyScore * (1 + engagementBoost) + followBoost + randomFactor;
      return { entry, score };
    });

    // Sort by score descending, then take only the page size
    scoredEntries.sort((a, b) => b.score - a.score);
    const rankedEntries = isFirstPage ? scoredEntries.slice(0, take) : scoredEntries;

    const publicEntries = rankedEntries.map(({ entry }: any) => {
      return {
        id: entry.id,
        body: entry.body,
        createdAt: entry.createdAt,
        images: entry.images,
        isLiked: userLikes.has(entry.id),
        isBookmarked: userBookmarks.has(entry.id),
        isFollowing: userFollowing.has(entry.user.id),
        likesCount: entry._count.likes,
        commentsCount: entry._count.comments,
        bookmarksCount: entry._count.bookmarks,
        user: { 
          id: entry.user.id,
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
      select: {
        id: true,
        body_encrypted: true,
        iv: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            photoURL: true,
          }
        },
        images: {
          select: { id: true, url: true }
        },
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
  const reqStart = performance.now();
  const userId = req.user!.uid;
  const { page = '1', limit = '10', search } = req.query;
  const MAX_LIMIT = 500;
  const take = Math.min(parseInt(limit as string), MAX_LIMIT);
  const skip = (parseInt(page as string) - 1) * take;

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

    const startPrisma = performance.now();
    const [entries, total] = await Promise.all([
      prisma.entry.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          body_encrypted: true,
          iv: true,
          createdAt: true,
          theme: true,
          templateId: true,
          isPublic: true,
          template: {
            select: { name: true }
          }
        },
      }),
      prisma.entry.count({ where: whereClause })
    ]);
    const endPrisma = performance.now();
    console.log(`[PROFILE] Promise.all(findMany, count) took: ${(endPrisma - startPrisma).toFixed(2)}ms`);

    const startMapping = performance.now();
    const decryptedEntries = entries.map((entry: any, index: number) => {
      const startEntry = performance.now();
      let body = "[Secure Content]";
      try {
        const startDecrypt = performance.now();
        body = decrypt(entry.body_encrypted, entry.iv);
        console.log(`[PROFILE] Decrypt entry ${index} took: ${(performance.now() - startDecrypt).toFixed(2)}ms`);
      } catch (err) {}
      
      const res = {
        ...entry,
        body,
        body_encrypted: undefined,
        iv: undefined,
      };
      console.log(`[PROFILE] Map entry ${index} total: ${(performance.now() - startEntry).toFixed(2)}ms`);
      return res;
    });
    const endMapping = performance.now();
    console.log(`[PROFILE] Total Array.map() took: ${(endMapping - startMapping).toFixed(2)}ms`);

    const startSerialize = performance.now();
    const payload = JSON.stringify({ entries: decryptedEntries, total, page: parseInt(page as string) });
    const endSerialize = performance.now();
    console.log(`[PROFILE] JSON.stringify took: ${(endSerialize - startSerialize).toFixed(2)}ms (Size: ${(payload.length / 1024).toFixed(2)} KB)`);

    res.setHeader('Content-Type', 'application/json');
    res.send(payload);
    
    console.log(`[PROFILE] Total GET /api/entries execution: ${(performance.now() - reqStart).toFixed(2)}ms`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

// POST /api/entries/:id/like - Toggle Like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id as string;
  try {
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!entry.isPublic && entry.userId !== userId) return res.status(403).json({ error: 'Access denied' });

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
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!entry.isPublic && entry.userId !== userId) return res.status(403).json({ error: 'Access denied' });

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
router.get('/:id/comments', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.entry.findUnique({ where: { id: req.params.id as string } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!entry.isPublic && entry.userId !== req.user?.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
    
    if (entry.isPublic) {
      appCache.invalidatePrefix('public-feed-');
    }
    
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

    if (entry.isPublic || isPublic === true) {
      appCache.invalidatePrefix('public-feed-');
    }

    res.json({ message: 'Entry updated successfully', id: entryId });
  } catch (error: any) {
    logger.error('Failed to update entry', error, { entryId, userId });
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

export default router;
