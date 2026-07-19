import prisma from './src/lib/prisma.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.DIARY_ENCRYPTION_KEY || process.env.JWT_SECRET as string;

function decrypt(encryptedText: string, ivHex: string): string {
  const [encrypted, authTag] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
    let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== ENCRYPTION_KEY) {
      try {
        const fallbackKey = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv);
        decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
        let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (fallbackErr) {}
    }
    const defaultKey = 'default-key-change-me-32chars!!';
    if (defaultKey !== ENCRYPTION_KEY && defaultKey !== process.env.JWT_SECRET) {
      try {
        const defKey = crypto.scryptSync(defaultKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', defKey, iv);
        decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
        let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (defErr) {}
    }
    throw err;
  }
}

async function main() {
  const userId = 'gUrtC1EOh2SIFMEst009lfUt2w93';
  const whereClause: any = { userId };
  
  try {
    const [entries, total] = await prisma.$transaction([
      prisma.entry.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: { template: true, responses: true, images: true },
      }),
      prisma.entry.count({ where: whereClause })
    ]);

    const decryptedEntries = entries.map((entry: any) => {
      let body = "[Secure Content]";
      try {
        body = decrypt(entry.body_encrypted, entry.iv);
      } catch (err) {
        console.error("Decrypt error for entry", entry.id, err);
      }
      return {
        ...entry,
        body,
        body_encrypted: undefined,
        iv: undefined,
      };
    });

    console.log("Success! Total:", total);
    console.log("Entries:", decryptedEntries.length);
  } catch (error) {
    console.error("Failed to list entries:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
