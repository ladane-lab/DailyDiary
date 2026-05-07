import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/challenges - List all challenges
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany();
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list challenges' });
  }
});

// POST /api/challenges/:id/join - Join a challenge
router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;
  const challengeId = req.params.id as string;

  try {
    const existing = await prisma.userChallenge.findFirst({
      where: { userId, challengeId, completed: false },
    });

    if (existing) {
      res.status(400).json({ error: 'Already enrolled in this challenge' });
      return;
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: req.user?.email || 'unknown@example.com',
        name: (req.user as any)?.name || req.user?.email?.split('@')[0] || 'Writer',
      },
    });

    const userChallenge = await prisma.userChallenge.create({
      data: { userId, challengeId, currentDay: 0, completed: false },
      include: { challenge: true },
    });

    res.status(201).json(userChallenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// GET /api/challenges/my - Get user's active challenges
router.get('/my', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    const userChallenges = await prisma.userChallenge.findMany({
      where: { userId },
      include: { challenge: true },
      orderBy: { completed: 'asc' },
    });
    res.json(userChallenges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

export default router;
