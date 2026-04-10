import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { authenticate } from './middleware/auth.js';
import userRoutes from './routes/users.js';
import entryRoutes from './routes/entries.js';
import templateRoutes from './routes/templates.js';
import challengeRoutes from './routes/challenges.js';
import { seedTemplates, seedChallenges } from './services/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ─── Public Routes ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: '✅ DailyDiary API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Templates are publicly readable
app.use('/api/templates', templateRoutes);

// Public entries feed (no auth required)
app.get('/api/entries/public', async (_req, res) => {
  // Forward to entries router — handled inside entries.ts
  res.redirect(307, '/api/entries-internal/public');
});

// ─── Protected Routes ───────────────────────────────────────────
app.use('/api/users', authenticate, userRoutes);
app.use('/api/entries', authenticate, entryRoutes);
app.use('/api/entries-internal', entryRoutes); // Internal redirect target
app.use('/api/challenges', authenticate, challengeRoutes);

// ─── Server Start ───────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`🚀 DailyDiary API Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════');
  console.log('');

  // Seed default data
  try {
    console.log('📦 Seeding default data...');
    await seedTemplates();
    await seedChallenges();
    console.log('✅ Seeding complete!\n');
  } catch (error) {
    console.log('⚠️  Seeding skipped (DB may not be connected yet)');
    console.log('   Set DATABASE_URL in .env to enable\n');
  }
});

export default app;
