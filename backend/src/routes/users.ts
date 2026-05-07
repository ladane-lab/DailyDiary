import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/users/sync - Create or update user after Firebase login
router.post('/sync', async (req: AuthRequest, res: Response) => {
  const { email, name, firebaseId } = req.body;

  if (!email || !name || !firebaseId) {
    res.status(400).json({ error: 'email, name, and firebaseId are required' });
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        id: firebaseId,
        email,
        name,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/users/me - Get current user profile
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const currentEmail = req.user?.email || 'unknown@example.com';
    const userId = req.user!.uid;

    const existingUserByEmail = await prisma.user.findUnique({ where: { email: currentEmail } });

    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      console.log(`[API-Me] Identity mismatch detected for ${currentEmail}. Starting full migration...`);
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
        console.log(`[API-Me] Identity migration successful for ${currentEmail}`);
      } catch (err) {
        console.error(`[API-Me] Migration failed during transaction.`, err);
      }
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { email: currentEmail },
      create: {
        id: userId,
        email: currentEmail,
        name: (req.user as any)?.name || currentEmail.split('@')[0] || 'Writer',
      },
      include: {
        userBadges: { include: { badge: true } },
        userChallenges: { include: { challenge: true } },
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
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
    
    console.log(`[API-Theme] Updating theme for user ${userId}: ${templateId} -> ${theme}`);
    
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
        console.log(`[API-Theme] Updated latest entry ${latestEntry.id} theme to ${theme}`);
      }
    } catch (err) {
      console.warn(`[API-Theme] Fallback entry theme update failed (non-critical):`, err);
    }

    console.log(`[API-Theme] Successfully saved preferences for ${userId}`);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

export default router;
