"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { widgets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  const widgetId = generateId();
  const now = new Date();

  await db.insert(widgets).values({
    id: widgetId,
    dashboardId,
    categoryId: widgetData.categoryId || null,
    type: widgetData.type,
    x: widgetData.x,
    y: widgetData.y,
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
    x: widgetData.x,
    y: widgetData.y,
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

  await db.delete(widgets).where(eq(widgets.id, widgetId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateWidgetPositions(
  updates: Array<{ id: string; x: number; y: number; w: number; h: number }>
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Mise à jour en batch
  for (const update of updates) {
    await db
      .update(widgets)
      .set({ x: update.x, y: update.y, w: update.w, h: update.h })
      .where(eq(widgets.id, update.id));
  }

  revalidatePath("/dashboard");
  return { success: true };
}
