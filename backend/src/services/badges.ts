import prisma from '../lib/prisma.js';

interface BadgeDefinition {
  name: string;
  icon: string;
  condition: string;
  check: (userId: string) => Promise<boolean>;
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    name: 'First Entry',
    icon: '📝',
    condition: 'Write your first diary entry',
    check: async (userId: string) => {
      const count = await prisma.entry.count({ where: { userId } });
      return count >= 1;
    },
  },
  {
    name: '7 Day Streak',
    icon: '🔥',
    condition: 'Maintain a 7-day writing streak',
    check: async (userId: string) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return (user?.streakCount ?? 0) >= 7;
    },
  },
  {
    name: '21 Day Champion',
    icon: '🏆',
    condition: 'Maintain a 21-day writing streak',
    check: async (userId: string) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return (user?.streakCount ?? 0) >= 21;
    },
  },
  {
    name: 'Century Writer',
    icon: '💯',
    condition: 'Write 100 diary entries',
    check: async (userId: string) => {
      const count = await prisma.entry.count({ where: { userId } });
      return count >= 100;
    },
  },
  {
    name: 'Challenge Conqueror',
    icon: '🥇',
    condition: 'Complete any challenge',
    check: async (userId: string) => {
      const completed = await prisma.userChallenge.count({
        where: { userId, completed: true },
      });
      return completed >= 1;
    },
  },
];

/**
 * Check and award badges for a given user.
 * Call this after entry creation or challenge completion.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awarded: string[] = [];

  for (const def of badgeDefinitions) {
    // Find or create badge definition in DB
    let badge = await prisma.badge.findFirst({ where: { name: def.name } });
    if (!badge) {
      badge = await prisma.badge.create({
        data: { name: def.name, icon: def.icon, condition: def.condition },
      });
    }

    // Check if already awarded
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    if (existing) continue;

    // Check condition
    const earned = await def.check(userId);
    if (earned) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      });
      awarded.push(def.name);
    }
  }

  return awarded;
}
