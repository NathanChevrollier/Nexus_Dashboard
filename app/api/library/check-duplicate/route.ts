import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { libraryItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, type } = await request.json();

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type required' }, { status: 400 });
    }

    const existing = await db.select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.userId, session.user.id),
          eq(libraryItems.title, title),
          eq(libraryItems.type, type)
        )
      )
      .limit(1);

    return NextResponse.json({
      isDuplicate: existing.length > 0,
      existingItem: existing[0] || null
    });
  } catch (error) {
    console.error('[CHECK-DUPLICATE]', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
