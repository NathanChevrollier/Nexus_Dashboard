import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dashboards,
  widgets,
  categories,
  integrations,
  mediaItems,
  calendarEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const providedPassword = (body && body.password) || null;

    // If a password is provided, verify it against stored hash
    if (providedPassword) {
      const [userRow] = await db.select().from(dashboards).where(eq(dashboards.userId, session.user.id)).limit(1).catch(() => []);
      // Note: we cannot get password from dashboards table; instead fetch from users
      const [user] = await db.select().from((await import("@/lib/db/schema")).users).where(eq((await import("@/lib/db/schema")).users.id, session.user.id)).limit(1);
      if (!user || !user.password) return NextResponse.json({ error: "Impossible de vérifier le mot de passe" }, { status: 400 });
      const match = await bcrypt.compare(providedPassword, user.password);
      if (!match) return NextResponse.json({ error: "Mot de passe invalide" }, { status: 403 });
    }

    const userId = session.user.id;

    // Delete widgets and categories for each dashboard
    const userDashboards = await db.select().from(dashboards).where(eq(dashboards.userId, userId));
    for (const d of userDashboards) {
      await db.delete(widgets).where(eq(widgets.dashboardId, d.id));
      await db.delete(categories).where(eq(categories.dashboardId, d.id));
    }

    // Delete dashboards
    await db.delete(dashboards).where(eq(dashboards.userId, userId));

    // Delete integrations / media / calendar events
    await db.delete(integrations).where(eq(integrations.userId, userId));
    await db.delete(mediaItems).where(eq(mediaItems.userId, userId));
    await db.delete(calendarEvents).where(eq(calendarEvents.userId, userId));

    // Insert a fresh default dashboard (use built-in crypto.randomUUID to avoid uuid package interop issues)
    const { randomUUID } = await import('node:crypto');
    const newId = `dashboard-${randomUUID()}`;
    const slug = `dashboard-${randomUUID().slice(0, 8)}`;
    await db.insert(dashboards).values({ id: newId, userId, name: "Mon tableau de bord", slug, isPublic: false, themeConfig: {}, customCss: "" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset self error:", error);
    const safeResponse: any = { error: "Erreur interne" };
    if (process.env.NODE_ENV !== 'production') {
      safeResponse.details = String(error);
    }
    return NextResponse.json(safeResponse, { status: 500 });
  }
}
