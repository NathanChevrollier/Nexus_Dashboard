import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: Request, ctx: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json([], { status: 200 });

    // Await params safely
    const params = await Promise.resolve(ctx?.params);
    const convId = (params && params.id) ? params.id as string : (() => {
      try { const u = new URL(req.url); const parts = u.pathname.split('/').filter(Boolean); return parts[parts.length - 1]; } catch (e) { return null; }
    })();
    if (!convId) return NextResponse.json([], { status: 400 });

    const rows = await db.select().from(participants).where(eq(participants.conversationId, convId));
    // enrich with user info when possible
    const enriched = [] as any[];
    for (const p of rows) {
      const [u] = await db.select().from(users).where(eq(users.id, p.userId)).limit(1).catch(() => []);
      enriched.push({ ...p, user: u || null });
    }

    return NextResponse.json(enriched || []);
  } catch (e) {
    console.error('GET participants error', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Await params safely
    const params = await Promise.resolve(ctx?.params);
    const convId = (params && params.id) ? params.id as string : (() => {
      try { const u = new URL(req.url); const parts = u.pathname.split('/').filter(Boolean); return parts[parts.length - 1]; } catch (e) { return null; }
    })();
    if (!convId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const participantIds: string[] = body.participantIds || [];
    if (!participantIds || participantIds.length === 0) return NextResponse.json({ error: 'participantIds required' }, { status: 400 });

    // Avoid adding participants that already exist for this conversation
    const existing = await db.select().from(participants).where(eq(participants.conversationId, convId)).catch(() => []);
    const existingUserIds = new Set(existing.map((r: any) => r.userId));

    const inserted: any[] = [];
    const errors: Array<{ userId: string; error: string }> = [];
    for (const uid of Array.from(new Set(participantIds))) {
      if (uid === session.user.id) {
        errors.push({ userId: uid, error: 'cannot_add_self' });
        continue;
      }
      if (existingUserIds.has(uid)) {
        errors.push({ userId: uid, error: 'already_participant' });
        continue;
      }
      try {
        const id = nanoid();
        await db.insert(participants).values({ id, conversationId: convId, userId: uid }).catch(() => {});
        const [p] = await db.select().from(participants).where(eq(participants.id, id)).limit(1).catch(() => []);
        if (p) inserted.push(p);
      } catch (e) {
        console.warn('participant insert error', e);
        errors.push({ userId: uid, error: 'insert_failed' });
      }
    }

    return NextResponse.json({ ok: true, inserted, errors });
  } catch (e) {
    console.error('POST participants error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
