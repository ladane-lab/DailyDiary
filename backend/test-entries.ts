
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Database for Entries ---');
  const userCount = await prisma.user.count();
  const entryCount = await prisma.entry.count();
  console.log(`Total Users: ${userCount}`);
  console.log(`Total Entries: ${entryCount}`);

  const recentEntries = await prisma.entry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true } },
      responses: true
    }
  });

  console.log('\n--- Recent 5 Entries ---');
  recentEntries.forEach((e, i) => {
    console.log(`${i+1}. User: ${e.user.email} | CreatedAt: ${e.createdAt}`);
    console.log(`   Encrypted Body: ${e.body_encrypted.substring(0, 30)}...`);
    console.log(`   Responses: ${e.responses.length}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
