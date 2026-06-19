import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const publicEntries = await prisma.entry.findMany({
    where: { isPublic: true },
    include: { user: { select: { name: true, email: true } } }
  });
  console.log('Public Entries:', JSON.stringify(publicEntries, null, 2));
  
  const allUsers = await prisma.user.findMany();
  console.log('Total Users:', allUsers.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
