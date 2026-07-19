import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set. See backend/.env");
  }

  return new PrismaClient({ log: ['error', 'warn'] });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma4: PrismaClient | undefined;
}

const prisma = globalThis.__prisma4 ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma4 = prisma;
}

export default prisma;
