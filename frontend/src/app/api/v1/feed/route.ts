import { NextRequest, NextResponse } from 'next/server';
import { EntryRepository } from '@/repositories/EntryRepository';
import { CryptoService } from '@/services/CryptoService';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(req: NextRequest) {
  try {
    // Require Authentication
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const entries = await EntryRepository.findManyPublic(limit + 1, cursor);
    
    let nextCursor: string | undefined = undefined;
    if (entries.length > limit) {
      const nextItem = entries.pop();
      nextCursor = nextItem?.id;
    }

    const decryptedEntries = entries.map((entry) => {
      let decryptedBody = '';
      try {
        decryptedBody = CryptoService.decrypt(entry.body_encrypted, entry.iv);
      } catch (e) {
        console.error(`Failed to decrypt feed entry ${entry.id}`, e);
        decryptedBody = '*(Encrypted content unavailable)*';
      }

      const { body_encrypted, iv, ...safeEntry } = entry;
      return {
        ...safeEntry,
        body: decryptedBody,
      };
    });

    return NextResponse.json({
      entries: decryptedEntries,
      nextCursor,
    });
  } catch (error: any) {
    console.error('Error fetching feed entries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
