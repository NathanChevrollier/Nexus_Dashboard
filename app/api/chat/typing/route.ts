import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SOCKET_EMIT_URL = process.env.SOCKET_EMIT_URL || process.env.SOCKET_SERVER_URL || "http://localhost:4001/emit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const convId = (body.conversationId || body.conversation || body.id || null);
    const typing = !!body.typing;
    if (!convId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    // verify participant
    const rows = await db.select().from(participants).where(eq(participants.conversationId, convId));
    const isParticipant = rows.some((r: any) => r.userId === session.user.id);
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // notify all participants except sender
    try {
      for (const p of rows) {
        if (p.userId === session.user.id) continue;
        await fetch(SOCKET_EMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'chat:typing', targetUserId: p.userId, payload: { conversationId: convId, userId: session.user.id, typing } }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('typing emit error', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST typing error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
