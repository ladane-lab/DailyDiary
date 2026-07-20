import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

// POST /api/users/sync - Create or update user after Firebase login
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  const { email, name, photoURL } = req.body;
  const firebaseId = req.user!.uid;

  if (!email || !name) {
    res.status(400).json({ error: 'email and name are required' });
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, photoURL },
      create: {
        id: firebaseId,
        email,
        name,
        photoURL,
      },
    });
    res.json(user);
  } catch (error) {
    logger.error('User sync error', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/users/me - Get current user profile
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: { include: { badge: true } },
        userChallenges: { include: { challenge: true } },
      },
    });

    if (!user) {
      // User not synced yet — return 404 so the client triggers /sync
      res.status(404).json({ error: 'User not found. Please sync your account.' });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user error', error, { userId: req.user?.uid });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /api/users/theme - Update preferred theme for a template
router.patch('/theme', async (req: AuthRequest, res: Response) => {
  const { templateId, theme } = req.body;
  const userId = req.user!.uid;

  if (!templateId || !theme) {
    res.status(400).json({ error: 'templateId and theme are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currentThemes = (user?.preferredThemes as Record<string, string>) || {};
    
    logger.info(`Updating theme for user`, { userId, templateId, theme });
    
    // 1. Update User-wide preference
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferredThemes: {
          ...currentThemes,
          [templateId]: theme
        }
      }
    });

    // 2. Also update the theme of the LATEST entry for this template to ensure fallback works
    try {
      const latestEntry = await prisma.entry.findFirst({
        where: { 
          userId,
          OR: [
            { templateId },
            { template: { name: templateId } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (latestEntry) {
        await prisma.entry.update({
          where: { id: latestEntry.id },
          data: { theme }
        });
        logger.info(`Updated latest entry theme`, { entryId: latestEntry.id, theme });
      }
    } catch (err) {
      logger.warn(`Fallback entry theme update failed`, err);
    }

    logger.info(`Successfully saved theme preferences`, { userId });
    res.json(updatedUser);
  } catch (error) {
    logger.error('Update theme error', error, { userId });
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// POST /api/users/:id/follow - Toggle Follow/Subscribe
router.post('/:id/follow', async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.uid;
  const followingId = req.params.id as string;

  if (followerId === followingId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  try {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });

    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } }
      });
      res.json({ followed: false });
    } else {
      await prisma.follow.create({
        data: { followerId, followingId }
      });
      res.json({ followed: true });
    }
  } catch (err) {
    logger.error('Follow error', err, { followerId, followingId });
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

// DELETE /api/users - Delete user account and all their data (DPDP Act compliance)
router.delete('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  try {
    logger.info(`Initiating full account deletion`, { userId });
    await prisma.$transaction([
      prisma.entryResponse.deleteMany({ where: { entry: { userId } } }),
      prisma.image.deleteMany({ where: { entry: { userId } } }),
      prisma.like.deleteMany({ where: { userId } }),
      prisma.comment.deleteMany({ where: { userId } }),
      prisma.bookmark.deleteMany({ where: { userId } }),
      prisma.tracker.deleteMany({ where: { userId } }),
      prisma.userBadge.deleteMany({ where: { userId } }),
      prisma.userChallenge.deleteMany({ where: { userId } }),
      prisma.entry.deleteMany({ where: { userId } }),
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId },
            { followingId: userId }
          ]
        }
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    res.json({ success: true, message: 'Account and all associated data deleted successfully' });
  } catch (error: any) {
    logger.error('Delete account error', error, { userId });
    res.status(500).json({ error: 'Failed to delete account data', details: error.message });
  }
});

export default router;

