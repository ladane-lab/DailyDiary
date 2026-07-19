import { db } from '../lib/db';

export class BadgeRepository {
  static async findMany() {
    return db.badge.findMany();
  }

  static async findUserBadges(userId: string) {
    return db.userBadge.findMany({ where: { userId } });
  }

  static async createBadges(data: { name: string; icon: string; condition: string }[]) {
    return db.badge.createMany({ data });
  }

  static async awardBadges(data: { userId: string; badgeId: string }[]) {
    return db.userBadge.createMany({ data });
  }
}
