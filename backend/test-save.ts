
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-me-32chars!!';

function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

async function main() {
  console.log('--- Database Entry Creation Test ---');
  const userId = "test-verification-id-" + Date.now();
  const body = "Test entry content at " + new Date().toISOString();

  try {
    console.log('1. Upserting user...');
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `test-${Date.now()}@example.com`, name: "Tester" },
    });

    console.log('2. Encrypting body...');
    const { encrypted, iv } = encrypt(body);

    console.log('3. Creating entry...');
    const entry = await prisma.entry.create({
      data: {
        userId,
        body_encrypted: encrypted,
        iv,
        isPublic: false,
      }
    });
    console.log('✅ Entry created successfully:', entry.id);
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    console.error(error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
