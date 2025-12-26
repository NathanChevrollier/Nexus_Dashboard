"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { widgets, dashboards } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/utils";

export async function createWidget(
  dashboardId: string,
  widgetData: {
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    options: any;
    categoryId?: string | null;
  }
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que l'utilisateur possède ce dashboard
  const dashboard = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, dashboardId),
      eq(dashboards.userId, session.user.id)
    ),
  });

  if (!dashboard) {
    throw new Error("Dashboard non trouvé ou accès refusé");
  }

  const widgetId = generateId();
  const now = new Date();

  // Si la position fournie est 0,0 ou non définie, calculer une position dynamique
  let x = widgetData.x ?? 0;
  let y = widgetData.y ?? 0;

  if ((x === 0 && y === 0) || (widgetData.x === undefined && widgetData.y === undefined)) {
    // Récupérer le bas maximal des widgets existants sur ce dashboard
    const existing = await db.select({ y: widgets.y, h: widgets.h }).from(widgets).where(eq(widgets.dashboardId, dashboardId));
    const bottoms = existing.map((w: any) => (Number(w.y || 0) + Number(w.h || 0)));
    const maxBottom = bottoms.length ? Math.max(...bottoms) : 0;
    y = maxBottom;
    x = 0;
  }

  await db.insert(widgets).values({
    id: widgetId,
    dashboardId,
    categoryId: widgetData.categoryId || null,
    type: widgetData.type,
    x,
    y,
    w: widgetData.w,
    h: widgetData.h,
    options: widgetData.options,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${dashboardId}`);
  
  return {
    id: widgetId,
    dashboardId,
    categoryId: widgetData.categoryId || null,
    type: widgetData.type,
    x,
    y,
    w: widgetData.w,
    h: widgetData.h,
    options: widgetData.options,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateWidget(
  widgetId: string,
  updates: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    options?: any;
    categoryId?: string | null;
  }
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que le widget appartient bien à un dashboard de l'utilisateur
  const widget = await db.query.widgets.findFirst({
    where: eq(widgets.id, widgetId),
  });

  if (!widget) {
    throw new Error("Widget non trouvé");
  }

  const dashboard = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, widget.dashboardId),
      eq(dashboards.userId, session.user.id)
    ),
  });

  if (!dashboard) {
    throw new Error("Accès refusé");
  }

  await db
    .update(widgets)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(widgets.id, widgetId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteWidget(widgetId: string) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Vérifier que le widget appartient bien à un dashboard de l'utilisateur
  const widget = await db.query.widgets.findFirst({
    where: eq(widgets.id, widgetId),
  });

  if (!widget) {
    throw new Error("Widget non trouvé");
  }

  const dashboard = await db.query.dashboards.findFirst({
    where: and(
      eq(dashboards.id, widget.dashboardId),
      eq(dashboards.userId, session.user.id)
    ),
  });

  if (!dashboard) {
    throw new Error("Accès refusé");
  }

  await db.delete(widgets).where(eq(widgets.id, widgetId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateWidgetPositions(
  updates: Array<{ 
    id: string; 
    x: number; 
    y: number; 
    w: number; 
    h: number; 
    categoryId?: string | null;
    categoryX?: number;
    categoryY?: number;
  }>
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  const widgetIds = updates.map((u) => u.id);

  // Vérifier que tous les widgets appartiennent à des dashboards de l'utilisateur
  const allowedWidgets = await db
    .select({ id: widgets.id })
    .from(widgets)
    .innerJoin(dashboards, eq(widgets.dashboardId, dashboards.id))
    .where(
      and(
        inArray(widgets.id, widgetIds),
        eq(dashboards.userId, session.user.id)
      )
    );

  const allowedIds = new Set(allowedWidgets.map((w) => w.id));

  for (const update of updates) {
    if (!allowedIds.has(update.id)) {
      throw new Error("Accès refusé pour au moins un widget");
    }
  }

  // Mise à jour en batch
  for (const update of updates) {
    await db
      .update(widgets)
      .set({ 
        x: update.x, 
        y: update.y, 
        w: update.w, 
        h: update.h,
        categoryId: update.categoryId !== undefined ? update.categoryId : undefined,
        categoryX: update.categoryX !== undefined ? update.categoryX : undefined,
        categoryY: update.categoryY !== undefined ? update.categoryY : undefined,
      })
      .where(eq(widgets.id, update.id));
  }

  revalidatePath("/dashboard");
  return { success: true };
}
