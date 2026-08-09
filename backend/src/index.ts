import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import compression from 'compression';
import { authenticate } from './middleware/auth.js';
import userRoutes from './routes/users.js';
import entryRoutes from './routes/entries.js';
import publicEntriesRoutes from './routes/publicEntries.js';
import templateRoutes from './routes/templates.js';
import challengeRoutes from './routes/challenges.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import { seedTemplates, seedChallenges } from './services/seed.js';
import prisma from './lib/prisma.js';
import { admin } from './lib/firebaseAdmin.js';
import logger from './lib/logger.js';
import { v2 as cloudinary } from 'cloudinary';

// Health and cleanup imports
import { liveProbe, readyProbe, healthCheck } from './monitoring/health.js';
import { initScheduledCleanup } from './monitoring/cleanup.js';

// Security stack imports
import {
  configureHelmet,
  configureCors,
  limitPayloadSize,
  globalSecurityGuard,
  authenticatedSecurityGuard,
  validateFileUpload,
} from './middleware/securityMiddleware.js';
import { authorizeAdmin } from './middleware/authorizeAdmin.js';
import redisService from './services/redisService.js';

dotenv.config();

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ─── Environment Validation ──────────────────────────────────────
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('BACKEND_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
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

// Apply global security headers & CORS whitelisting
app.use(configureHelmet);
app.use(configureCors);

// Enforce global request payload size limit (1MB for json)
app.use(limitPayloadSize);
app.use(express.json());

app.use(compression());

// ─── Ensure uploads directory exists ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!isCloudinaryConfigured) {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Multer storage config ───────────────────────────────────────
const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadsDir),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max overall
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Serve uploaded files statically ────────────────────────────
if (!isCloudinaryConfigured) {
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploadsDir));
}

// ─── Public Routes ──────────────────────────────────────────────
app.get('/live', liveProbe);
app.get('/ready', readyProbe);
app.get('/health', healthCheck);

// ─── Application Endpoint Security Guard (Applies CSRF, Rate Limiting, Risk Analysis) ───
app.use('/api', globalSecurityGuard);

// ─── Protected Routes ───
app.use('/api/templates', authenticate, authenticatedSecurityGuard, templateRoutes);
app.use('/api/entries/public', publicEntriesRoutes);
app.use('/api/entries', authenticate, authenticatedSecurityGuard, entryRoutes);

// ─── Image Upload Route (authenticated) ─────────────────────────
app.post('/api/upload', authenticate, authenticatedSecurityGuard, upload.single('image'), validateFileUpload, async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'dailydiary' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      return res.json({ url: result.secure_url });
    } catch (uploadErr) {
      logger.error('❌ Cloudinary Upload Error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload image to cloud storage' });
    }
  } else {
    // Local fallback
    // Generate URL dynamically based on the incoming request so it works in production without BACKEND_URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const API = process.env.BACKEND_URL || `${protocol}://${host}`;
    const url = `${API}/uploads/${req.file.filename}`;
    return res.json({ url });
  }
});

// ─── Protected Routes continued ─────────────────────────────────
app.use('/api/users', authenticate, authenticatedSecurityGuard, userRoutes);
app.use('/api/challenges', authenticate, authenticatedSecurityGuard, challengeRoutes);
app.use('/api/dashboard', authenticate, authenticatedSecurityGuard, dashboardRoutes);
app.use('/api/admin', authenticate, authorizeAdmin, authenticatedSecurityGuard, adminRoutes);

// ─── Server Start ───────────────────────────────────────────────
initScheduledCleanup();

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
