import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sharedDashboards, dashboards, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const rows = await db
      .select()
      .from(sharedDashboards)
      .where(
        and(
          eq(sharedDashboards.targetUserId, session.user.id),
          eq(sharedDashboards.status, 'accepted')
        )
      );

    const enriched = await Promise.all(rows.map(async (r) => {
      const [dash] = await db.select().from(dashboards).where(eq(dashboards.id, r.dashboardId)).limit(1);
      const [owner] = await db.select().from(users).where(eq(users.id, r.ownerId)).limit(1);
      return {
        ...r,
        dashboard: dash || null,
        owner: owner ? { id: owner.id, email: owner.email, name: owner.name } : null,
      };
    }));

    return NextResponse.json({ ok: true, shares: enriched });
  } catch (error) {
    console.error('Accepted shares error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
