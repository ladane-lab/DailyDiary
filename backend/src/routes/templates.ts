import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { appCache } from '../lib/cache.js';

const router = Router();

// GET /api/templates - List all templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await appCache.getOrFetch('templates-all', async () => {
      return await prisma.template.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }, 60 * 60 * 1000); // 1 hour TTL
    res.json(templates);
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id as string },
    });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

export default router;
