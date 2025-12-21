"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, widgets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function reorderCategories(categoryIds: string[]) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  // Update order for each category
  for (let i = 0; i < categoryIds.length; i++) {
    await db
      .update(categories)
      .set({ order: i })
      .where(eq(categories.id, categoryIds[i]));
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function moveWidgetToCategory(widgetId: string, categoryId: string | null) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  await db
    .update(widgets)
    .set({ 
      categoryId: categoryId,
      updatedAt: new Date() 
    })
    .where(eq(widgets.id, widgetId));

  revalidatePath("/dashboard");
  return { success: true };
}
