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

export default router;
