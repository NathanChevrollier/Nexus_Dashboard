import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { participants, messages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request, ctx: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const _params = await Promise.resolve(ctx?.params);
    const convId = _params?.id as string;
    if (!convId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const messageId: string | undefined = body?.messageId;

    // Verify participant
    const [p] = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.conversationId, convId),
          eq(participants.userId, session.user.id),
        ),
      )
      .limit(1)
      .catch(() => []);
    if (!p) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let newReadAt = new Date();
    if (messageId) {
      const [m] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1).catch(() => []);
      if (m && m.createdAt) newReadAt = new Date(m.createdAt);
    }

    try {
      await db.update(participants).set({ lastReadAt: newReadAt }).where(eq(participants.id, p.id));
      return NextResponse.json({ ok: true, lastReadAt: newReadAt.toISOString() });
    } catch (e) {
      console.warn('mark read error', e);
      return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
    }
  } catch (e) {
    console.error('POST read error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
