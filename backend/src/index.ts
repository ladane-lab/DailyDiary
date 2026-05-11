import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { authenticate, optionalAuthenticate } from './middleware/auth.js';
import userRoutes from './routes/users.js';
import entryRoutes from './routes/entries.js';
import templateRoutes from './routes/templates.js';
import challengeRoutes from './routes/challenges.js';
import { seedTemplates, seedChallenges } from './services/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure uploads directory exists ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Multer storage config ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// ─── Serve uploaded files statically ────────────────────────────
app.use('/uploads', express.static(uploadsDir));

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

// Public entries feed (optional auth to show likes/saves)
app.use('/api/entries/public', optionalAuthenticate, entryRoutes);

// ─── Image Upload Route (authenticated) ─────────────────────────
app.post('/api/upload', authenticate, upload.single('image'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const API = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  const url = `${API}/uploads/${req.file.filename}`;
  return res.json({ url });
});

// ─── Protected Routes ───────────────────────────────────────────
app.use('/api/users', authenticate, userRoutes);
app.use('/api/entries', authenticate, entryRoutes);
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
