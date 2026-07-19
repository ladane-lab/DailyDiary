import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Configure Neon to use the external ws module
neonConfig.webSocketConstructor = ws;

const connectionString = `${process.env.DATABASE_URL}`;

// Create connection pool and Prisma adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db =
  global.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}
