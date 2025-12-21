"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface DashboardExport {
  version: string;
  exportDate: string;
  dashboard: {
    name: string;
    slug: string;
    isPublic: boolean;
    themeConfig: any;
    customCss: string | null;
  };
  categories: Array<{
    name: string;
    icon: string | null;
    color: string | null;
    order: number;
    isCollapsed: boolean;
  }>;
  widgets: Array<{
    type: string;
    categoryId: string | null;
    position: { x: number; y: number; w: number; h: number };
    options: any;
  }>;
}

export async function exportDashboard(dashboardId: string): Promise<DashboardExport | null> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié");

  // Get dashboard
  const dashboard = await db.query.dashboards.findFirst({
    where: eq(dashboards.id, dashboardId),
  });

  if (!dashboard || dashboard.userId !== session.user.id) {
    throw new Error("Dashboard non trouvé ou accès refusé");
  }

  // Get widgets
  const dashboardWidgets = await db.query.widgets.findMany({
    where: eq(widgets.dashboardId, dashboardId),
  });

  // Get categories
  const dashboardCategories = await db.query.categories.findMany({
    where: eq(categories.dashboardId, dashboardId),
  });

  const exportData: DashboardExport = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    dashboard: {
      name: dashboard.name,
      slug: dashboard.slug,
      isPublic: dashboard.isPublic,
      themeConfig: dashboard.themeConfig,
      customCss: dashboard.customCss,
    },
    categories: dashboardCategories.map((cat: any) => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      order: cat.order,
      isCollapsed: cat.isCollapsed,
    })),
    widgets: dashboardWidgets.map((w: any) => ({
      type: w.type,
      categoryId: w.categoryId,
      position: { x: w.x, y: w.y, w: w.w, h: w.h },
      options: w.options,
    })),
  };

  return exportData;
}

export async function importDashboard(
  importData: DashboardExport,
  dashboardName?: string
): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    // Create new dashboard
    const newDashboardId = `dash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const slug = (dashboardName || importData.dashboard.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    await db.insert(dashboards).values({
      id: newDashboardId,
      userId: session.user.id,
      name: dashboardName || importData.dashboard.name,
      slug: `${slug}-${Date.now()}`, // Ensure unique
      isPublic: false, // Always private on import
      themeConfig: importData.dashboard.themeConfig,
      customCss: importData.dashboard.customCss,
    });

    // Create categories
    const categoryIdMap = new Map<string, string>();
    
    for (const cat of importData.categories) {
      const newCatId = `cat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await db.insert(categories).values({
        id: newCatId,
        dashboardId: newDashboardId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
        isCollapsed: cat.isCollapsed,
      });

      // We'll need to remap category IDs
      categoryIdMap.set(cat.name, newCatId);
    }

    // Create widgets
    for (const widget of importData.widgets) {
      const newWidgetId = `widget-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await db.insert(widgets).values({
        id: newWidgetId,
        dashboardId: newDashboardId,
        categoryId: widget.categoryId ? categoryIdMap.get(widget.categoryId) || null : null,
        type: widget.type,
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
        options: widget.options,
      });
    }

    return { success: true, dashboardId: newDashboardId };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, error: "Erreur lors de l'import" };
  }
}

export async function duplicateDashboard(dashboardId: string): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    // Export then import
    const exportData = await exportDashboard(dashboardId);
    if (!exportData) {
      return { success: false, error: "Erreur lors de l'export" };
    }

    return await importDashboard(exportData, `${exportData.dashboard.name} (Copie)`);
  } catch (error) {
    console.error("Duplicate error:", error);
    return { success: false, error: "Erreur lors de la duplication" };
  }
}
