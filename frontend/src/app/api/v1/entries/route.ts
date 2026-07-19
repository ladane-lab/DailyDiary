import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/authMiddleware';
import { createEntrySchema } from '@/validators/entryValidator';
import { EntryService } from '@/services/EntryService';
import { EntryRepository } from '@/repositories/EntryRepository';
import { CryptoService } from '@/services/CryptoService';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const entry = await EntryService.createEntry({
      userId: user.uid,
      userEmail: user.email || 'unknown@example.com',
      userName: user.name || '',
      ...parsed.data,
      body: parsed.data.body || '',
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const entries = await EntryRepository.findManyByUserId(user.uid, limit + 1, cursor);
    
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
        console.error(`Failed to decrypt entry ${entry.id}`, e);
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
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

