import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 Syncing database schema with Prisma models...\n');

  // 1. Add missing columns to User table
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoURL" TEXT;`);
    console.log('✅ User.photoURL column ensured');
  } catch (e: any) { console.log('⚠️  User.photoURL:', e.message); }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredThemes" JSONB;`);
    console.log('✅ User.preferredThemes column ensured');
  } catch (e: any) { console.log('⚠️  User.preferredThemes:', e.message); }

  // 2. Add missing columns to Entry table
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'marble';`);
    console.log('✅ Entry.theme column ensured');
  } catch (e: any) { console.log('⚠️  Entry.theme:', e.message); }

  // 3. Create Like table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Like" (
        "userId" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Like_pkey" PRIMARY KEY ("userId","entryId"),
        CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Like_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✅ Like table ensured');
  } catch (e: any) { console.log('⚠️  Like table:', e.message); }

  // 4. Create Bookmark table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Bookmark" (
        "userId" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId","entryId"),
        CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Bookmark_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✅ Bookmark table ensured');
  } catch (e: any) { console.log('⚠️  Bookmark table:', e.message); }

  // 5. Create Comment table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Comment" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Comment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✅ Comment table ensured');
  } catch (e: any) { console.log('⚠️  Comment table:', e.message); }

  // 6. Create Follow table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Follow" (
        "followerId" TEXT NOT NULL,
        "followingId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId"),
        CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✅ Follow table ensured');
  } catch (e: any) { console.log('⚠️  Follow table:', e.message); }

  // 7. Create indexes for performance
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "Like_userId_idx" ON "Like"("userId");`,
    `CREATE INDEX IF NOT EXISTS "Like_entryId_idx" ON "Like"("entryId");`,
    `CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId");`,
    `CREATE INDEX IF NOT EXISTS "Bookmark_entryId_idx" ON "Bookmark"("entryId");`,
    `CREATE INDEX IF NOT EXISTS "Comment_entryId_idx" ON "Comment"("entryId");`,
    `CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");`,
    `CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId");`,
    `CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId");`,
  ];

  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(idx);
    } catch (e: any) { /* index may already exist */ }
  }
  console.log('✅ Indexes ensured');

  console.log('\n🎉 Database schema sync complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
