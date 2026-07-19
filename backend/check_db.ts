import prisma from './src/lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users);

  const entries = await prisma.entry.findMany();
  console.log("Entries count:", entries.length);
  if (entries.length > 0) {
    console.log("First entry:", entries[0]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
