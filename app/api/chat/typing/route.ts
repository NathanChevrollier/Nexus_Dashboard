import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    // notify all participants except sender via centralized helper
    try {
      const { emitToUser } = await import('@/lib/socket');
      for (const p of rows) {
        if (p.userId === session.user.id) continue;
        try {
          await emitToUser(p.userId, 'chat:typing', { conversationId: convId, userId: session.user.id, typing });
        } catch (e) {
          // best-effort
        }
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
