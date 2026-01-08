import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversations, participants, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { and } from 'drizzle-orm';

export async function DELETE(req: Request, { params }: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const convId = (params && params.id) ? params.id as string : (() => {
      try { const u = new URL(req.url); const parts = u.pathname.split('/').filter(Boolean); return parts[parts.length - 1]; } catch (e) { return null; }
    })();
    if (!convId) return NextResponse.json({ error: 'conversation id required' }, { status: 400 });

    // check if user is participant or admin
    const isAdmin = session.user.role === 'ADMIN';
    const part = await db.select().from(participants).where(and(eq(participants.conversationId, convId), eq(participants.userId, session.user.id))).limit(1).catch(() => []);
    if (!isAdmin && (!part || part.length === 0)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // delete messages, participants, conversation (best-effort)
    try { await db.delete(messages).where(eq(messages.conversationId, convId)); } catch (e) {}
    try { await db.delete(participants).where(eq(participants.conversationId, convId)); } catch (e) {}
    try { await db.delete(conversations).where(eq(conversations.id, convId)); } catch (e) {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE conversation error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const convId = (params && params.id) ? params.id as string : (() => {
      try { const u = new URL(req.url); const parts = u.pathname.split('/').filter(Boolean); return parts[parts.length - 1]; } catch (e) { return null; }
    })();
    if (!convId) return NextResponse.json({ error: 'conversation id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const title = body.title?.trim();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    // check permission: participant or admin
    const isAdmin = session.user.role === 'ADMIN';
    const part = await db.select().from(participants).where(and(eq(participants.conversationId, convId), eq(participants.userId, session.user.id))).limit(1).catch(() => []);
    if (!isAdmin && (!part || part.length === 0)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.update(conversations).set({ title }).where(eq(conversations.id, convId)).catch(() => {});
    return NextResponse.json({ ok: true, title });
  } catch (e) {
    console.error('PATCH conversation error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
