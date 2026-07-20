import { Client } from 'pg';
import { performance } from 'perf_hooks';
import prisma from './src/lib/prisma.js';

async function testNetwork() {
  console.log("=== Database Connection & Latency Test ===");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No DATABASE_URL");

  // 1. Raw Node-Postgres (pg) test
  const pgStart = performance.now();
  const client = new Client({ connectionString });
  
  const connectStart = performance.now();
  await client.connect();
  const connectEnd = performance.now();
  
  const queryStart = performance.now();
  await client.query('SELECT 1');
  const queryEnd = performance.now();
  
  await client.end();
  const pgEnd = performance.now();

  console.log(`[PG] Connection Acquisition: ${(connectEnd - connectStart).toFixed(2)}ms`);
  console.log(`[PG] Query Execution (SELECT 1): ${(queryEnd - queryStart).toFixed(2)}ms`);
  console.log(`[PG] Total Roundtrip: ${(pgEnd - pgStart).toFixed(2)}ms\n`);

  // 2. Prisma warm up and test
  const prismaConnectStart = performance.now();
  await prisma.$connect();
  const prismaConnectEnd = performance.now();
  console.log(`[Prisma] Connection Acquisition ($connect): ${(prismaConnectEnd - prismaConnectStart).toFixed(2)}ms`);

  const prismaQueryStart = performance.now();
  await prisma.$queryRawUnsafe('SELECT 1');
  const prismaQueryEnd = performance.now();
  console.log(`[Prisma] Query Execution (SELECT 1): ${(prismaQueryEnd - prismaQueryStart).toFixed(2)}ms`);
  
  // 3. Prisma actual model query
  const prismaModelStart = performance.now();
  await prisma.user.findFirst();
  const prismaModelEnd = performance.now();
  console.log(`[Prisma] Model Query Execution (findFirst): ${(prismaModelEnd - prismaModelStart).toFixed(2)}ms`);

  await prisma.$disconnect();
}

testNetwork().catch(console.error);
