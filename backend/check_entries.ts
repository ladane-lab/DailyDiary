import prisma from './src/lib/prisma.js';

async function main() {
  const entries = await prisma.entry.findMany();
  
  const userIds = entries.map(e => e.userId);
  const uniqueUserIds = [...new Set(userIds)];
  
  console.log("Unique user IDs in entries:", uniqueUserIds);
  console.log("Total entries:", entries.length);
  
  uniqueUserIds.forEach(id => {
    const count = entries.filter(e => e.userId === id).length;
    console.log(`User ${id.substring(0, 30)}... has ${count} entries`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
