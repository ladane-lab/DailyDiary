import prisma from '../lib/prisma.js';

interface BadgeContext {
  entryCount: number;
  streakCount: number;
  completedChallengesCount: number;
}

interface BadgeDefinition {
  name: string;
  icon: string;
  condition: string;
  check: (ctx: BadgeContext) => boolean;
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    name: 'First Entry',
    icon: '📝',
    condition: 'Write your first diary entry',
    check: (ctx) => ctx.entryCount >= 1,
  },
  {
    name: '7 Day Streak',
    icon: '🔥',
    condition: 'Maintain a 7-day writing streak',
    check: (ctx) => ctx.streakCount >= 7,
  },
  {
    name: '21 Day Champion',
    icon: '🏆',
    condition: 'Maintain a 21-day writing streak',
    check: (ctx) => ctx.streakCount >= 21,
  },
  {
    name: 'Century Writer',
    icon: '💯',
    condition: 'Write 100 diary entries',
    check: (ctx) => ctx.entryCount >= 100,
  },
  {
    name: 'Challenge Conqueror',
    icon: '🥇',
    condition: 'Complete any challenge',
    check: (ctx) => ctx.completedChallengesCount >= 1,
  },
];

/**
 * Check and award badges for a given user.
 * Fetches all required data in a single parallel batch (no N+1 queries).
 * Call this after entry creation or challenge completion.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  // 1. Fetch everything we need in one concurrent batch — was 7 sequential queries, now 5 parallel
  const [allBadges, userBadges, user, entryCount, completedChallengesCount] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { streakCount: true } }),
    prisma.entry.count({ where: { userId } }),
    prisma.userChallenge.count({ where: { userId, completed: true } }),
  ]);

  // 2. Seed any missing badge definitions
  let currentBadges = allBadges;
  const missingBadges = badgeDefinitions.filter(def => !currentBadges.find(b => b.name === def.name));
  if (missingBadges.length > 0) {
    await prisma.badge.createMany({
      data: missingBadges.map(def => ({ name: def.name, icon: def.icon, condition: def.condition }))
    });
    currentBadges = await prisma.badge.findMany();
  }

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

  // 3. Build context from pre-fetched data — zero extra DB calls
  const ctx: BadgeContext = {
    entryCount,
    streakCount: user?.streakCount ?? 0,
    completedChallengesCount,
  };

  // 4. Evaluate all badge conditions synchronously against the cached context
  const newlyEarned = badgeDefinitions
    .map(def => {
      const badge = currentBadges.find(b => b.name === def.name)!;
      if (!badge || earnedBadgeIds.has(badge.id)) return null;
      return def.check(ctx) ? { badgeId: badge.id, name: def.name } : null;
    })
    .filter((r): r is { badgeId: string; name: string } => r !== null);

  if (newlyEarned.length > 0) {
    await prisma.userBadge.createMany({
      data: newlyEarned.map(r => ({ userId, badgeId: r.badgeId })),
      skipDuplicates: true,
    });
    return newlyEarned.map(r => r.name);
  }

  return [];
}
