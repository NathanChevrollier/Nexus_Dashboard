import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, users, sharedDashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

const bodySchema = z.object({ dashboardId: z.string().min(1), targetEmail: z.string().email(), permission: z.enum(["read", "edit"]), integrationIds: z.array(z.string()).optional() });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { dashboardId, targetEmail, permission, integrationIds } = parsed.data;

    // Check ownership
    const [dash] = await db.select().from(dashboards).where(eq(dashboards.id, dashboardId)).limit(1);
    if (!dash) return NextResponse.json({ error: "Dashboard introuvable" }, { status: 404 });
    if (dash.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Find target user
    const [target] = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);
    if (!target) return NextResponse.json({ error: "Utilisateur cible introuvable" }, { status: 404 });

    // Create share record
    const id = generateId();
    await db.insert(sharedDashboards).values({
      id,
      dashboardId,
      ownerId: session.user.id,
      targetUserId: target.id,
      permission,
      status: 'pending',
      integrationIds: integrationIds || [],
    });

    // Emit realtime notification to target user (best-effort)
    try {
      const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:4001/emit';
      await fetch(socketUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'share:created', targetUserId: target.id, payload: { shareId: id, dashboardId, ownerId: session.user.id } }),
      });
    } catch (err) {
      console.warn('Failed to emit share created event', err);
    }

    return NextResponse.json({ ok: true, shareId: id });
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
