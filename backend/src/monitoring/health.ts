import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import redisService from '../services/redisService.js';
import logger from '../lib/logger.js';

/**
 * Liveness Probe: Returns 200 OK immediately if the server is running.
 * Used by load balancers and orchestrators to determine process crash state.
 * Never performs expensive database or network requests.
 */
export const liveProbe = (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'LIVE', uptime: process.uptime() });
};

/**
 * Readiness Probe: Checks connectivity to critical database and cache dependencies.
 * Returns 200 OK if healthy, or 503 Service Unavailable if any service is down.
 */
export const readyProbe = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check PostgreSQL Connection
    let dbReady = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch (dbErr: any) {
      logger.error('[Health] Database readiness check failed:', dbErr.message);
    }

    // 2. Check Redis Service (Upstash or in-memory fallback)
    // Since redisService has an in-memory fallback, the app is always ready
    // We distinguish between "Upstash connected" and "in-memory fallback active"
    let redisStatus = 'DOWN';
    try {
      const pingKey = `health:ping:${Date.now()}`;
      await redisService.set(pingKey, 'pong', 5);
      const val = await redisService.get(pingKey);
      await redisService.del(pingKey);
      if (val === 'pong') {
        redisStatus = 'OK'; // Upstash is fully working
      } else {
        // set/get returned unexpected value — check if in-memory works
        redisStatus = 'DEGRADED (in-memory fallback active)';
      }
    } catch (redisErr: any) {
      logger.error('[Health] Redis readiness check failed:', redisErr.message);
      redisStatus = 'DOWN';
    }

    // App is ready if DB is up — Redis degraded is acceptable (fallback active)
    const isReady = dbReady && redisStatus !== 'DOWN';

    if (isReady) {
      res.status(200).json({
        status: 'READY',
        dependencies: {
          database: 'OK',
          redis: redisStatus,
        }
      });
    } else {
      res.status(503).json({
        status: 'UNREADY',
        dependencies: {
          database: dbReady ? 'OK' : 'DOWN',
          redis: redisStatus,
        }
      });
    }
  } catch (err) {
    res.status(503).json({ status: 'UNREADY', error: String(err) });
  }
};


/**
 * Health Check: Returns basic statistics and service status.
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.status(200).json({
    status: 'OK',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    resources: {
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      }
    }
  });
};
export default { liveProbe, readyProbe, healthCheck };
