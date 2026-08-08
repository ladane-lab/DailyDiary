import prisma from '../lib/prisma.js';
import { SECURITY_CONFIG } from '../config/securityConfig.js';
import logger from '../lib/logger.js';

class TrustedDeviceService {
  /**
   * Verifies if a device is recognized/trusted for the given user.
   * If recognized, updates lastSeenAt in the background.
   */
  async isDeviceTrusted(userId: string, fingerprintHash: string): Promise<boolean> {
    if (!fingerprintHash) return false;
    
    try {
      const device = await prisma.trustedDevice.findUnique({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash
          }
        }
      });

      if (device) {
        // Update last seen timestamp asynchronously (non-blocking)
        prisma.trustedDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() }
        }).catch(err => {
          logger.debug(`[TrustedDevice] Failed to update lastSeenAt: ${err.message}`);
        });
        return true;
      }
    } catch (error) {
      logger.error(`[TrustedDevice] Error verifying device for user ${userId}`, error);
    }

    return false;
  }

  /**
   * Registers a new trusted device for a user.
   * Enforces a hard cap of 10 devices, evicting the oldest based on lastSeenAt (FIFO).
   */
  async addTrustedDevice(userId: string, fingerprintHash: string, deviceName?: string): Promise<void> {
    if (!fingerprintHash) return;

    try {
      // 1. Upsert device record to set/update lastSeenAt
      await prisma.trustedDevice.upsert({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash
          }
        },
        update: {
          lastSeenAt: new Date()
        },
        create: {
          userId,
          fingerprintHash,
          deviceName: deviceName || null,
          lastSeenAt: new Date()
        }
      });

      // 2. Fetch all registered devices sorted by lastSeenAt (newest first)
      const devices = await prisma.trustedDevice.findMany({
        where: { userId },
        orderBy: { lastSeenAt: 'desc' }
      });

      const maxCap = SECURITY_CONFIG.auth.maxDeviceFingerprintsPerUser; // 10
      if (devices.length > maxCap) {
        // Get the oldest excess devices
        const excess = devices.slice(maxCap);
        const idsToDelete = excess.map(d => d.id);

        await prisma.trustedDevice.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
        logger.info(`[TrustedDevice] Evicted ${idsToDelete.length} excess trusted devices for user: ${userId}`);
      }
    } catch (error) {
      logger.error(`[TrustedDevice] Error adding trusted device for user ${userId}`, error);
    }
  }

  /**
   * Removes all trusted devices for a user (useful on account deletion).
   */
  async removeAllDevices(userId: string): Promise<void> {
    try {
      await prisma.trustedDevice.deleteMany({
        where: { userId }
      });
    } catch (error) {
      logger.error(`[TrustedDevice] Error removing devices for user ${userId}`, error);
    }
  }
}

export const trustedDeviceService = new TrustedDeviceService();
export default trustedDeviceService;
