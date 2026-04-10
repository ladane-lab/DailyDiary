
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database User Cleanup Check ---');
  const users = await prisma.user.findMany({
    select: { id: true, email: true }
  });

  const junkUsers = users.filter(u => u.id.length > 50); // JWTs are very long
  console.log(`Total local users: ${users.length}`);
  console.log(`Junk users detected: ${junkUsers.length}`);

  if (junkUsers.length > 0) {
    console.log('Cleaning up junk users and their entries...');
    for (const user of junkUsers) {
      // Delete entries, responses, etc. (cascading manually if needed)
      // Actually Prisma relation delete can be complex if not set to cascade
      console.log(`- Deleting junk user: ${user.email} (${user.id.substring(0, 10)}...)`);
    }
    
    // Perform deletion
    await prisma.entryResponse.deleteMany({ where: { entry: { userId: { in: junkUsers.map(u => u.id) } } } });
    await prisma.image.deleteMany({ where: { entry: { userId: { in: junkUsers.map(u => u.id) } } } });
    await prisma.entry.deleteMany({ where: { userId: { in: junkUsers.map(u => u.id) } } });
    await prisma.userBadge.deleteMany({ where: { userId: { in: junkUsers.map(u => u.id) } } });
    await prisma.userChallenge.deleteMany({ where: { userId: { in: junkUsers.map(u => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: junkUsers.map(u => u.id) } } });
    
    console.log('✅ Cleanup complete.');
  } else {
    console.log('No junk users found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
