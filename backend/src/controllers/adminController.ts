import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import redisService from '../services/redisService.js';
import { getAlertLevel } from '../security/attackDetector.js';
import logger from '../lib/logger.js';

class AdminController {

  /**
   * Fetches aggregated security statistics for the admin dashboard
   */
  async getSecurityStats(req: Request, res: Response): Promise<void> {
    try {
      const past24Hours = new Date(Date.now() - 24 * 3600 * 1000);

      // 1. Locked Accounts Count (from User table)
      const lockedAccounts = await prisma.user.findMany({
        where: { lockUntil: { gt: new Date() } },
        select: { id: true, email: true, lockUntil: true }
      });

      // 2. Blocked IPs Count (from BlockedIP table)
      const blockedIps = await prisma.blockedIP.findMany({
        where: { expiresAt: { gt: new Date() } },
        select: { ip: true, reason: true, blockedAt: true, expiresAt: true }
      });

      // 3. Failed Logins Count in last 24h (from SecurityEvent table)
      const failedLoginsCount = await prisma.securityEvent.count({
        where: {
          eventType: 'LOGIN_FAILURE',
          timestamp: { gte: past24Hours }
        }
      });

      // 4. Rate Limited Requests Count in last 24h (from SecurityEvent table)
      const rateLimitedCount = await prisma.securityEvent.count({
        where: {
          eventType: 'DELAYED',
          timestamp: { gte: past24Hours }
        }
      });

      // 5. Total blocks count in last 24h
      const blockedEventsCount = await prisma.securityEvent.count({
        where: {
          eventType: 'BLOCKED',
          timestamp: { gte: past24Hours }
        }
      });

      // 6. Top Attacked Endpoints in last 24h (where riskScore > 30)
      const topAttackedEndpoints = await prisma.securityEvent.groupBy({
        by: ['endpoint'],
        where: {
          riskScore: { gt: 30 },
          timestamp: { gte: past24Hours }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      });

      // 7. Recent Security Incidents (last 20 high-threat events)
      const recentIncidents = await prisma.securityEvent.findMany({
        where: { riskScore: { gt: 30 } },
        orderBy: { timestamp: 'desc' },
        take: 20
      });

      // 8. System Alert Level
      const alertLevel = await getAlertLevel();

      // Formulate return object
      res.json({
        alertLevel,
        stats: {
          activeLockedAccounts: lockedAccounts.length,
          activeBlockedIps: blockedIps.length,
          failedLoginsPast24h: failedLoginsCount,
          rateLimitedPast24h: rateLimitedCount,
          blockedRequestsPast24h: blockedEventsCount,
        },
        lockedAccountsList: lockedAccounts,
        blockedIpsList: blockedIps,
        topAttackedEndpoints: topAttackedEndpoints.map(e => ({
          endpoint: e.endpoint,
          attacksCount: e._count.id
        })),
        recentIncidents: recentIncidents.map(i => ({
          id: i.id,
          ip: i.ip,
          country: i.country || 'Unknown',
          browser: i.browser || 'Unknown',
          endpoint: i.endpoint,
          eventType: i.eventType,
          reason: i.reason,
          riskScore: i.riskScore,
          timestamp: i.timestamp
        }))
      });
    } catch (error) {
      logger.error('[AdminController] Error fetching security metrics:', error);
      res.status(500).json({ error: 'Failed to aggregate security dashboard statistics.' });
    }
  }
}

export const adminController = new AdminController();
export default adminController;
