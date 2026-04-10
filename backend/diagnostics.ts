
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("FATAL: DATABASE_URL is not set.");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function runDiagnostics() {
  console.log('--- SYSTEM DIAGNOSTICS ---');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Current working directory:', process.cwd());
  
  try {
    console.log('1. Testing Database Connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Connection OK:', result);

    console.log('2. Checking for users...');
    const users = await prisma.user.findMany({ take: 5 });
    console.log(`   ✅ Found ${users.length} users.`);
    users.forEach(u => console.log(`      - ${u.email} (ID: ${u.id.substring(0, 8)}...)`));

    console.log('3. Simulation: Entry Creation for a new stable UID...');
    const mockUid = "diag-user-" + Date.now();
    const mockEmail = "diag-" + Date.now() + "@example.com";
    
    await prisma.user.create({
      data: { id: mockUid, email: mockEmail, name: "Diag Tester" }
    });
    console.log('   ✅ Mock user created.');

    const entry = await prisma.entry.create({
      data: {
        userId: mockUid,
        body_encrypted: "encrypted_test_data",
        iv: "iv_test_data",
        isPublic: false
      }
    });
    console.log('   ✅ Entry created successfully:', entry.id);

    console.log('4. Verification: Fetching back...');
    const fetched = await prisma.entry.findUnique({ where: { id: entry.id } });
    if (fetched) console.log('   ✅ Entry exists in DB.');
    
    // Cleanup
    await prisma.entry.delete({ where: { id: entry.id } });
    await prisma.user.delete({ where: { id: mockUid } });
    console.log('   ✅ Cleanup success.');

  } catch (err: any) {
    console.error('--- DIAGNOSTIC FAILURE ---');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.code) console.error('Prisma Error Code:', err.code);
    if (err.stack) console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();
