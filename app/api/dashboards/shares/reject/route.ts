import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sharedDashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({ shareId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { shareId } = parsed.data;

    const [record] = await db.select().from(sharedDashboards).where(eq(sharedDashboards.id, shareId)).limit(1);
    if (!record) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    if (record.targetUserId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    await db.delete(sharedDashboards).where(eq(sharedDashboards.id, shareId));

    // Emit realtime notification to owner (best-effort)
    try {
      const { emitToUser } = await import('@/lib/socket');
      await emitToUser(record.ownerId, 'share:rejected', { shareId, dashboardId: record.dashboardId, targetUserId: session.user.id });
    } catch (err) {
      console.warn('Failed to emit share rejected event', err);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reject share error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
