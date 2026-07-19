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
  const [allBadges, userBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId } })
  ]);

  let currentBadges = allBadges;
  const missingBadges = badgeDefinitions.filter(def => !currentBadges.find(b => b.name === def.name));
  if (missingBadges.length > 0) {
    await prisma.badge.createMany({
      data: missingBadges.map(def => ({ name: def.name, icon: def.icon, condition: def.condition }))
    });
    currentBadges = await prisma.badge.findMany();
  }

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

  const checkPromises = badgeDefinitions.map(async (def) => {
    const badge = currentBadges.find(b => b.name === def.name)!;
    if (earnedBadgeIds.has(badge.id)) return null;

    const earned = await def.check(userId);
    if (earned) {
      return { badgeId: badge.id, name: def.name };
    }
    return null;
  });

  const results = await Promise.all(checkPromises);
  const newlyEarned = results.filter((r): r is {badgeId: string, name: string} => r !== null);

  if (newlyEarned.length > 0) {
    await prisma.userBadge.createMany({
      data: newlyEarned.map(r => ({ userId, badgeId: r.badgeId }))
    });
    return newlyEarned.map(r => r.name);
  }

  return [];
}
