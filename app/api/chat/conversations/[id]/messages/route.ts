import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, participants, messages } from "@/lib/db/schema";
import { eq, desc, and, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

const SOCKET_EMIT_URL = process.env.SOCKET_EMIT_URL || process.env.SOCKET_SERVER_URL || "http://localhost:4001/emit";

export async function GET(req: Request, ctx: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // `params` can be a promise in some runtimes — await safely
    const params = await Promise.resolve(ctx?.params);
    const convId = params?.id as string;
    if (!convId) return NextResponse.json({ error: "conversation id required" }, { status: 400 });

    // Vérifier que user est participant
    const [p] = await db.select().from(participants).where(and(eq(participants.conversationId, convId), eq(participants.userId, session.user.id))).limit(1).catch(() => []);
    if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(10, parseInt(url.searchParams.get('limit') || '50')));
    const before = url.searchParams.get('before') || null; // ISO timestamp or message id

    // If before provided (timestamp), fetch messages older than before, otherwise fetch latest
    if (before) {
      // attempt to parse as ISO timestamp
      const isIso = !isNaN(Date.parse(before));
      if (isIso) {
        const rows = await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, convId), lt(messages.createdAt, new Date(before))))
          .orderBy(desc(messages.createdAt))
          .limit(limit);
        // return in chronological order
        return NextResponse.json((rows || []).reverse());
      } else {
        // treat before as message id: fetch createdAt of that message
        const [anchor] = await db.select().from(messages).where(eq(messages.id, before)).limit(1).catch(() => []);
        const anchorDate = anchor?.createdAt ? new Date(anchor.createdAt) : null;
        if (!anchorDate) return NextResponse.json([], { status: 200 });
        const rows = await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, convId), lt(messages.createdAt, anchorDate)))
          .orderBy(desc(messages.createdAt))
          .limit(limit);
        return NextResponse.json((rows || []).reverse());
      }
    }

    // No before: return latest `limit` messages in chronological order
    const latest = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .catch(() => []);
    return NextResponse.json((latest || []).reverse());
  } catch (err) {
    console.error("GET messages error", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Robustly determine conversation id (params may be a promise in some runtimes)
    const _params = await Promise.resolve(ctx?.params);
    const convId = (_params && _params.id) ? (_params.id as string) : (() => {
      try { const u = new URL(req.url); const parts = u.pathname.split('/').filter(Boolean); return parts[parts.length - 2]; } catch (e) { return null; }
    })();
    if (!convId) return NextResponse.json({ error: "conversation id required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const content: string = (body.content || "").toString().trim();
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    // Vérifier participant
    const [p] = await db.select().from(participants).where(and(eq(participants.conversationId, convId), eq(participants.userId, session.user.id))).limit(1).catch(() => []);
    if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const messageId = nanoid();

    await db.insert(messages).values({ id: messageId, conversationId: convId, senderId: session.user.id, content }).catch((e) => { throw e; });

    // Mettre à jour lastMessageId
    await db.update(conversations).set({ lastMessageId: messageId }).where(eq(conversations.id, convId)).catch(() => {});

    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1).catch(() => []);

    // Notifier participants via socket server HTTP /emit
    const targets = await db.select().from(participants).where(eq(participants.conversationId, convId));

    try {
      for (const t of targets) {
        // don't notify the sender about their own message
        if (t.userId === session.user.id) continue;
        await fetch(SOCKET_EMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'message:new', targetUserId: t.userId, payload: { conversationId: convId, message: msg } }),
        }).catch(() => {});
      }
    } catch (e) {
      // ignore socket errors for now
    }

    return NextResponse.json(msg || { id: messageId, content });
  } catch (err) {
    console.error("POST messages error", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
