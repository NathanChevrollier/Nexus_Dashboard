import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets, categories, integrations, mediaItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const userId = session.user.id;

    const userDashboards = await db.select().from(dashboards).where(eq(dashboards.userId, userId));

    const exportPayload = [] as any[];

    for (const d of userDashboards) {
      const dWidgets = await db.select().from(widgets).where(eq(widgets.dashboardId, d.id));
      const dCategories = await db.select().from(categories).where(eq(categories.dashboardId, d.id));
      exportPayload.push({ dashboard: d, widgets: dWidgets, categories: dCategories });
    }

    const userIntegrations = await db.select().from(integrations).where(eq(integrations.userId, userId));
    const userMedia = await db.select().from(mediaItems).where(eq(mediaItems.userId, userId));

    return NextResponse.json({ dashboards: exportPayload, integrations: userIntegrations, media: userMedia });
  } catch (error) {
    console.error("Export dashboards error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
