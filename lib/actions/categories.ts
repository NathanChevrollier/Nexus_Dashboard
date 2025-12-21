"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, dashboards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateId } from "@/lib/utils";

export async function createCategory(
  dashboardId: string,
  categoryData: {
    name: string;
    icon?: string;
    color?: string;
    order?: number;
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
    throw new Error("Dashboard non trouvé");
  }

  const categoryId = generateId();
  const now = new Date();

  await db.insert(categories).values({
    id: categoryId,
    dashboardId,
    name: categoryData.name,
    icon: categoryData.icon || "📁",
    color: categoryData.color || "#3b82f6",
    order: categoryData.order || 0,
    isCollapsed: false,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${dashboard.slug}`);

  return {
    id: categoryId,
    dashboardId,
    name: categoryData.name,
    icon: categoryData.icon || "📁",
    color: categoryData.color || "#3b82f6",
    order: categoryData.order || 0,
    isCollapsed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCategory(
  categoryId: string,
  updates: {
    name?: string;
    icon?: string;
    color?: string;
    order?: number;
    isCollapsed?: boolean;
  }
) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  await db
    .update(categories)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId));

  revalidatePath("/dashboard");
}

export async function deleteCategory(categoryId: string) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  await db.delete(categories).where(eq(categories.id, categoryId));

  revalidatePath("/dashboard");
}

export async function toggleCategoryCollapse(categoryId: string, isCollapsed: boolean) {
  const session = await auth();
  
  if (!session) {
    throw new Error("Non authentifié");
  }

  await db
    .update(categories)
    .set({
      isCollapsed,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId));

  revalidatePath("/dashboard");
}
