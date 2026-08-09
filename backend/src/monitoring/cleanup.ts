import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { SECURITY_CONFIG } from '../config/securityConfig.js';

/**
 * Scheduled Database Maintenance & Sweeper Module
 * 
 * DESIGN DECISION: Since Render Free Tier restarts/sleeps, the cron job is application-process dependent.
 * To ensure sweeps are executed even if the process restarts frequently, we run a one-time safety cleanup 
 * on server startup, and schedule a daily node-cron sweeper at 03:00 AM server time.
 */

/**
 * Performs database tables cleanup
 */
export async function performMaintenanceCleanup(): Promise<void> {
  logger.info('[Cleanup] Starting database security tables maintenance sweeper...');
  const now = new Date();

  // 1. Purge expired BlockedIPs
  try {
    const deletedIPs = await prisma.blockedIP.deleteMany({
      where: { expiresAt: { lt: now } }
    });
    if (deletedIPs.count > 0) {
      logger.info(`[Cleanup] Purged ${deletedIPs.count} expired IP blocks from database.`);
    }
  } catch (error: any) {
    // Gracefully handle case where table doesn't exist yet (schema sync pending)
    if (error?.message?.includes('does not exist')) {
      logger.warn('[Cleanup] BlockedIP table not yet available — skipping. Will retry on next run.');
    } else {
      logger.error('[Cleanup] Error purging expired IP blocks:', error);
    }
  }

  // 2. Prune old SecurityEvents (older than 30 days)
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const deletedEvents = await prisma.securityEvent.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } }
    });
    if (deletedEvents.count > 0) {
      logger.info(`[Cleanup] Pruned ${deletedEvents.count} historical security events older than 30 days.`);
    }
  } catch (error: any) {
    if (error?.message?.includes('does not exist')) {
      logger.warn('[Cleanup] SecurityEvent table not yet available — skipping.');
    } else {
      logger.error('[Cleanup] Error pruning security events:', error);
    }
  }

  // 3. Enforce TrustedDevice cap of 10 per user
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let evictedDeviceCount = 0;
    const maxCap = SECURITY_CONFIG.auth.maxDeviceFingerprintsPerUser;

    for (const user of users) {
      const devices = await prisma.trustedDevice.findMany({
        where: { userId: user.id },
        orderBy: { lastSeenAt: 'desc' },
        select: { id: true }
      });

      if (devices.length > maxCap) {
        const idsToDelete = devices.slice(maxCap).map(d => d.id);
        await prisma.trustedDevice.deleteMany({ where: { id: { in: idsToDelete } } });
        evictedDeviceCount += idsToDelete.length;
      }
    }

    if (evictedDeviceCount > 0) {
      logger.info(`[Cleanup] Enforced device limit: Evicted ${evictedDeviceCount} old trusted devices.`);
    }
  } catch (error: any) {
    if (error?.message?.includes('does not exist')) {
      logger.warn('[Cleanup] TrustedDevice table not yet available — skipping.');
    } else {
      logger.error('[Cleanup] Error enforcing device cap:', error);
    }
  }

  logger.info('[Cleanup] Database maintenance sweep finished.');
}

/**
 * Initializes node-cron jobs
 */
export function initScheduledCleanup(): void {
  // 1. Run once immediately on startup as safety sweep
  setTimeout(() => {
    performMaintenanceCleanup().catch(err => {
      logger.error('[Cleanup] Startup safety sweep failed:', err);
    });
  }, 10000); // 10 second delay on startup to prevent blocking initial boots

  // 2. Schedule daily execution at 03:00 AM server time
  cron.schedule('0 3 * * *', async () => {
    logger.info('[Cron] Triggering daily maintenance sweeper...');
    await performMaintenanceCleanup();
  });

  logger.info('[Cron] Scheduled daily security cleanup cron job (03:00 AM daily).');
}
export default initScheduledCleanup;
