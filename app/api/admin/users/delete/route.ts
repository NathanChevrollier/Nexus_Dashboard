import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  dashboards,
  widgets,
  categories,
  integrations,
  mediaItems,
  calendarEvents,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/actions/permissions";

const bodySchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier la permission MANAGE_USERS
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

    // Check if target user is the owner (protected)
    const targetUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (targetUser?.isOwner) {
      return NextResponse.json(
        { error: "Le propriétaire de l'application ne peut pas être supprimé" },
        { status: 403 }
      );
    }

    // Prevent admins from deleting their own account
    if (session.user.id === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 403 });
    }
    // Fetch dashboards for user
    const userDashboards = await db.select().from(dashboards).where(eq(dashboards.userId, userId));

    // Delete widgets and categories tied to dashboards
    for (const d of userDashboards) {
      await db.delete(widgets).where(eq(widgets.dashboardId, d.id));
      await db.delete(categories).where(eq(categories.dashboardId, d.id));
    }

    // Delete dashboards
    await db.delete(dashboards).where(eq(dashboards.userId, userId));

    // Delete other user-owned data
    await db.delete(integrations).where(eq(integrations.userId, userId));
    await db.delete(mediaItems).where(eq(mediaItems.userId, userId));
    await db.delete(calendarEvents).where(eq(calendarEvents.userId, userId));

    // Delete auth records
    await db.delete(accounts).where(eq(accounts.userId, userId));
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, userId));

    // Finally delete the user record
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
