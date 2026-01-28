import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/actions/permissions";
import {
  dashboards,
  widgets,
  categories,
  integrations,
  mediaItems,
  calendarEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const bodySchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    
    const {allowed, error: permError} = await requirePermission("MANAGE_USERS");
    if (!allowed) {
      return NextResponse.json({ error: permError || "Accès refusé" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { userId } = parsed.data;

    // Fetch dashboards for user
    const userDashboards = await db.select().from(dashboards).where(eq(dashboards.userId, userId));

    // Delete widgets and categories tied to dashboards
    for (const d of userDashboards) {
      await db.delete(widgets).where(eq(widgets.dashboardId, d.id));
      await db.delete(categories).where(eq(categories.dashboardId, d.id));
    }

    // Delete dashboards
    await db.delete(dashboards).where(eq(dashboards.userId, userId));

    // Delete other user-owned data (but keep user account)
    await db.delete(integrations).where(eq(integrations.userId, userId));
    await db.delete(mediaItems).where(eq(mediaItems.userId, userId));
    await db.delete(calendarEvents).where(eq(calendarEvents.userId, userId));

    // Create a fresh default dashboard for the user
    const defaultDashboardId = randomUUID();
    const slug = `dashboard-${randomUUID()}`;
    await db.insert(dashboards).values({
      id: defaultDashboardId,
      userId,
      name: "Mon tableau de bord",
      slug,
      isPublic: false,
      themeConfig: {},
      customCss: "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin reset user error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
