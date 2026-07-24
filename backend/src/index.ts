import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import helmet from 'helmet';
import compression from 'compression';
import { authenticate } from './middleware/auth.js';
import userRoutes from './routes/users.js';
import entryRoutes from './routes/entries.js';
import templateRoutes from './routes/templates.js';
import challengeRoutes from './routes/challenges.js';
import dashboardRoutes from './routes/dashboard.js';
import { seedTemplates, seedChallenges } from './services/seed.js';
import prisma from './lib/prisma.js';
import { rateLimit } from 'express-rate-limit';
import logger from './lib/logger.js';

dotenv.config();

// ─── Environment Validation ──────────────────────────────────────
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('BACKEND_URL');
}
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error(`CRITICAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (!process.env.DIARY_ENCRYPTION_KEY) {
  logger.warn(`WARNING: DIARY_ENCRYPTION_KEY is not defined. Falling back to JWT_SECRET/default key.`);
} else if (process.env.DIARY_ENCRYPTION_KEY.length < 32) {
  logger.warn(`WARNING: DIARY_ENCRYPTION_KEY is shorter than 32 characters. AES-256 requires 32 bytes.`);
}

const app = express();

app.use((req, res, next) => {
  const start = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`[EXPRESS REQUEST] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration.toFixed(2)}ms`);
  });
  next();
});

const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(compression());

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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Middleware ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (e.g. mobile apps, curl, or server-to-server), allow it
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      /\.vercel\.app$/.test(new URL(origin).hostname) ||
      /(^|\.)dailydiary\.in$/.test(new URL(origin).hostname);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

// ─── Rate Limiting ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 15 : 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many write/sync requests from this IP, please try again after 15 minutes' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: process.env.NODE_ENV === 'production' ? 5 : 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many auth requests from this IP, please try again after 1 minute' },
});

// Apply global rate limiter
app.use(globalLimiter);

// Apply strict limiter on sensitive endpoints
app.use('/api/upload', strictLimiter);
app.use('/api/users/sync', authLimiter);
app.use('/api/users/theme', strictLimiter);
app.use('/api/entries', (req, res, next) => {
  if (req.method !== 'GET') {
    return strictLimiter(req, res, next);
  }
  next();
});

// ─── Serve uploaded files statically ────────────────────────────
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

// ─── Public Routes ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: '✅ DailyDiary API is running',
      version: '1.0.0',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (dbError) {
    console.error('❌ Healthcheck DB Connection Error:', dbError);
    res.status(500).json({
      status: '❌ DailyDiary API is unhealthy',
      version: '1.0.0',
      database: 'disconnected',
      error: dbError instanceof Error ? dbError.message : String(dbError),
      timestamp: new Date().toISOString(),
    });
  }
});

// Protected Routes (All API endpoints require authentication)
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/entries', authenticate, entryRoutes);

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
app.use('/api/challenges', authenticate, challengeRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

// ─── Server Start ───────────────────────────────────────────────
app.listen(PORT, async () => {
  logger.info(`DailyDiary API Server starting on http://localhost:${PORT}`);

  // Seed default data
  try {
    logger.info('Seeding default data...');
    await seedTemplates();
    await seedChallenges();
    logger.info('Seeding complete!');
    
    // ── Cache Warming ──
    logger.info('Warming cache for frequently accessed resources...');
    setTimeout(async () => {
      try {
        await Promise.all([
          fetch(`http://localhost:${PORT}/api/templates`),
        ]);
        logger.info('Cache warmed successfully!');
      } catch (warmErr) {
        logger.warn('Failed to warm cache:', warmErr);
      }
    }, 1000); // Small delay to let the server fully bind

  } catch (error) {
    logger.warn('Seeding skipped (DB may not be connected yet). Set DATABASE_URL in .env to enable.');
  }
});

export default app;
