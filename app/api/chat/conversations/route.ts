import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, participants, messages, users } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json([], { status: 200 });

    const userId = session.user.id;

    // Récupérer les conversations où l'utilisateur est participant
    const partRows = await db.select().from(participants).where(eq(participants.userId, userId));

    const convs: any[] = [];
    for (const p of partRows) {
      const [c] = await db.select().from(conversations).where(eq(conversations.id, p.conversationId)).limit(1).catch(() => []);
      if (!c) continue;
      // Récupérer dernier message
      const [last] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, c.id))
        .orderBy(desc(messages.createdAt))
        .limit(1)
        .catch(() => []);

      // Récupérer participants summary
      const parts = await db.select().from(participants).where(eq(participants.conversationId, c.id)).catch(() => []);
      let otherParticipant = null;
      let participantCount = (parts && parts.length) || 0;
      let highestRole: string | null = null;

      if (parts && parts.length === 2) {
        const other = parts.find((x: any) => x.userId !== userId);
        if (other) {
          const [u] = await db.select().from(users).where(eq(users.id, other.userId)).limit(1).catch(() => []);
          if (u) {
            otherParticipant = { id: u.id, name: u.name, role: u.role };
          }
        }
      }

      // Determine highest role among participants (priority: admin > moderator > vip > user)
      try {
        if (parts && parts.length > 0) {
          const userIds = parts.map((p: any) => p.userId);
          const rows = await db.select().from(users).where(inArray(users.id, userIds)).catch(() => []);
          const priority = ['admin', 'administrator', 'moderator', 'mod', 'vip', 'user', 'member'];
          for (const p of priority) {
            const found = rows.find((r: any) => (r.role || '').toString().toLowerCase().includes(p));
            if (found) { highestRole = found.role; break; }
          }
        }
      } catch (e) {
        console.warn('Could not compute highestRole', e);
      }

      convs.push({ ...c, lastMessage: last || null, otherParticipant, participantCount, highestRole });
    }

    return NextResponse.json(convs);
  } catch (err) {
    console.error("GET /api/chat/conversations error", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const participantIds: string[] = body.participantIds || [];
    const title: string | undefined = body.title;

    if (!participantIds || participantIds.length < 1) {
      return NextResponse.json({ error: "participantIds required" }, { status: 400 });
    }

    // ensure current user is participant
    const unique = Array.from(new Set([...participantIds, session.user.id]));

    // If this is a 2-person direct conversation, check for existing private conv
    if (unique.length === 2) {
      const [a, b] = unique;
      const partsA = await db.select().from(participants).where(eq(participants.userId, a)).catch(() => []);
      const partsB = await db.select().from(participants).where(eq(participants.userId, b)).catch(() => []);
      const common = partsA.map((p: any) => p.conversationId).filter((id: string) => partsB.some((pb: any) => pb.conversationId === id));
      if (common.length) {
        const [existing] = await db.select().from(conversations).where(eq(conversations.id, common[0])).limit(1).catch(() => []);
        if (existing) return NextResponse.json(existing);
      }
    }

    const convId = nanoid();
    await db.insert(conversations).values({ id: convId, title }).catch((e) => { throw e; });

    for (const uid of unique) {
      await db.insert(participants).values({ id: nanoid(), conversationId: convId, userId: uid }).catch(() => {});
    }

    const [created] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);

    return NextResponse.json(created || { id: convId });
  } catch (err) {
    console.error("POST /api/chat/conversations error", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
