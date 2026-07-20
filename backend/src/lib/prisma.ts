import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set. See backend/.env");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({ adapter, log: [{ emit: 'event', level: 'query' }, 'error', 'warn'] });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma4: PrismaClient | undefined;
}

const prisma = globalThis.__prisma4 ?? createPrismaClient();

// Prevent multiple event listeners in dev hot-reload
if (!(prisma as any)._hasQueryListener) {
  (prisma as any).$on('query', (e: any) => {
    console.log(`[PRISMA QUERY] Duration: ${e.duration}ms | Query: ${e.query}`);
  });
  (prisma as any)._hasQueryListener = true;
}

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma4 = prisma;
}

export default prisma;
