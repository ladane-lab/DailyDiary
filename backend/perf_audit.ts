import prisma from './src/lib/prisma.js';

async function audit() {
  console.log("=== DAILYDIARY PERFORMANCE AUDIT ===");
  const userId = 'gUrtC1EOh2SIFMEst009lfUt2w93'; // Test user

  // 1. Measure GET /api/entries
  const startEntries = performance.now();
  const [entries, total] = await prisma.$transaction([
    prisma.entry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
      include: { template: true, responses: true, images: true },
    }),
    prisma.entry.count({ where: { userId } })
  ]);
  const endEntries = performance.now();
  console.log(`[Database] GET /api/entries transaction: ${(endEntries - startEntries).toFixed(2)}ms`);

  // 2. Measure active challenges loop (Potential N+1)
  const startChallenges = performance.now();
  const activeChallenges = await prisma.userChallenge.findMany({
    where: { userId, completed: false },
    include: { challenge: true }
  });
  console.log(`[Database] activeChallenges findMany: ${(performance.now() - startChallenges).toFixed(2)}ms`);

  const startLoop = performance.now();
  for (const uc of activeChallenges) {
    const nextDay = uc.currentDay + 1;
    const completed = nextDay >= uc.challenge.duration;
    await prisma.userChallenge.update({
      where: { id: uc.id },
      data: { currentDay: nextDay, completed }
    });
  }
  const endLoop = performance.now();
  console.log(`[Database] activeChallenges N+1 update loop: ${(endLoop - startLoop).toFixed(2)}ms for ${activeChallenges.length} items`);

  // 3. Measure checkAndAwardBadges (Potential N+1)
  const startBadges = performance.now();
  // Simulating checkAndAwardBadges internals
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { entries: true, userBadges: { include: { badge: true } } }
  });
  const badges = await prisma.badge.findMany();
  // ... loop
  const endBadges = performance.now();
  console.log(`[Database] checkAndAwardBadges execution: ${(endBadges - startBadges).toFixed(2)}ms`);

  // 4. GET /api/users/me
  const startUserMe = performance.now();
  await prisma.user.upsert({
    where: { id: userId },
    update: { email: 'ladanejagannath@gmail.com' },
    create: {
      id: userId,
      email: 'ladanejagannath@gmail.com',
      name: 'Writer',
    },
    include: {
      userChallenges: { include: { challenge: true } },
      userBadges: { include: { badge: true } },
      trackers: true,
      preferredThemes: true,
    }
  });
  const endUserMe = performance.now();
  console.log(`[Database] GET /api/users/me (upsert & include): ${(endUserMe - startUserMe).toFixed(2)}ms`);

}

audit().catch(console.error).finally(() => prisma.$disconnect());
