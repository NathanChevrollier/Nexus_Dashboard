"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets, categories } from "@/lib/db/schema";

interface WidgetTemplate {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  options: any;
  category?: string;
}

interface CategoryTemplate {
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
}

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "productivity" | "monitoring" | "personal" | "dev" | "entertainment";
  widgets: WidgetTemplate[];
  categories?: CategoryTemplate[];
  themePreset?: string;
}

const layoutTemplates: LayoutTemplate[] = [
  {
    id: "productivity-pro",
    name: "Productivity Pro",
    description: "Dashboard pour la productivité maximale",
    icon: "⚡",
    category: "productivity",
    themePreset: "light",
    categories: [
      { name: "Quotidien", icon: "📅", color: "#3b82f6", order: 0 },
      { name: "Travail", icon: "💼", color: "#10b981", order: 1 },
    ],
    widgets: [
      {
        type: "datetime",
        x: 0, y: 0, w: 4, h: 1,
        options: { format: "PPP", timezone: "Europe/Paris" },
        category: "Quotidien",
      },
      {
        type: "weather",
        x: 4, y: 0, w: 2, h: 2,
        options: { city: "Paris" },
        category: "Quotidien",
      },
      {
        type: "notes",
        x: 0, y: 1, w: 4, h: 3,
        options: { title: "📋 Tâches du jour", content: "# À faire aujourd'hui\n\n- [ ] Tâche 1\n- [ ] Tâche 2\n- [ ] Tâche 3" },
        category: "Travail",
      },
      {
        type: "chart",
        x: 6, y: 0, w: 4, h: 2,
        options: { title: "Productivité hebdomadaire", chartType: "line" },
        category: "Travail",
      },
    ],
  },
  {
    id: "devops-control",
    name: "DevOps Control Center",
    description: "Monitoring et contrôle infrastructure",
    icon: "🔧",
    category: "monitoring",
    themePreset: "cyber-matrix",
    categories: [
      { name: "Production", icon: "🚀", color: "#ef4444", order: 0 },
      { name: "Staging", icon: "🧪", color: "#f59e0b", order: 1 },
      { name: "Métriques", icon: "📊", color: "#3b82f6", order: 2 },
    ],
    widgets: [
      {
        type: "ping",
        x: 0, y: 0, w: 3, h: 1,
        options: { title: "API Production", host: "api.prod.example.com", port: 443 },
        category: "Production",
      },
      {
        type: "ping",
        x: 3, y: 0, w: 3, h: 1,
        options: { title: "Database Prod", host: "db.prod.example.com", port: 3306 },
        category: "Production",
      },
      {
        type: "ping",
        x: 0, y: 1, w: 3, h: 1,
        options: { title: "API Staging", host: "api.staging.example.com", port: 443 },
        category: "Staging",
      },
      {
        type: "chart",
        x: 0, y: 2, w: 6, h: 2,
        options: { title: "Server CPU Usage", chartType: "area" },
        category: "Métriques",
      },
      {
        type: "notes",
        x: 6, y: 0, w: 4, h: 4,
        options: { title: "📝 Incidents Log", content: "# Incidents récents\n\n---\n\n_Aucun incident pour le moment_" },
        category: "Production",
      },
    ],
  },
  {
    id: "morning-routine",
    name: "Morning Routine",
    description: "Commencez votre journée du bon pied",
    icon: "☀️",
    category: "personal",
    themePreset: "light",
    widgets: [
      {
        type: "datetime",
        x: 0, y: 0, w: 6, h: 2,
        options: { format: "PPP", timezone: "Europe/Paris" },
      },
      {
        type: "weather",
        x: 6, y: 0, w: 3, h: 3,
        options: { city: "Paris" },
      },
      {
        type: "notes",
        x: 0, y: 2, w: 6, h: 3,
        options: { title: "📰 Morning Briefing", content: "# Ce matin\n\n## Agenda\n- Réunion équipe à 10h\n- Déjeuner client à 12h30\n\n## Focus\n**Priorité du jour:** Finir la présentation" },
      },
      {
        type: "chart",
        x: 9, y: 0, w: 3, h: 3,
        options: { title: "Humeur de la semaine", chartType: "bar" },
      },
    ],
  },
  {
    id: "developer-hub",
    name: "Developer Hub",
    description: "Dashboard pour développeurs",
    icon: "👨‍💻",
    category: "dev",
    themePreset: "cyber",
    categories: [
      { name: "Projets", icon: "🚀", color: "#3b82f6", order: 0 },
      { name: "Resources", icon: "📚", color: "#10b981", order: 1 },
    ],
    widgets: [
      {
        type: "link",
        x: 0, y: 0, w: 2, h: 1,
        options: { title: "GitHub", url: "https://github.com", icon: "🐙", openInNewTab: true },
        category: "Resources",
      },
      {
        type: "link",
        x: 2, y: 0, w: 2, h: 1,
        options: { title: "Stack Overflow", url: "https://stackoverflow.com", icon: "📚", openInNewTab: true },
        category: "Resources",
      },
      {
        type: "link",
        x: 4, y: 0, w: 2, h: 1,
        options: { title: "Dev.to", url: "https://dev.to", icon: "📝", openInNewTab: true },
        category: "Resources",
      },
      {
        type: "notes",
        x: 0, y: 1, w: 6, h: 3,
        options: { title: "💡 Code Snippets", content: "```javascript\n// Quick snippets\nconst fetchData = async (url) => {\n  const res = await fetch(url);\n  return res.json();\n};\n```" },
        category: "Projets",
      },
      {
        type: "chart",
        x: 6, y: 0, w: 4, h: 4,
        options: { title: "Commits cette semaine", chartType: "bar" },
        category: "Projets",
      },
    ],
  },
  {
    id: "minimal-focus",
    name: "Minimal Focus",
    description: "Minimaliste pour la concentration",
    icon: "🎯",
    category: "productivity",
    themePreset: "oled",
    widgets: [
      {
        type: "datetime",
        x: 0, y: 0, w: 12, h: 2,
        options: { format: "PPP", timezone: "Europe/Paris" },
      },
      {
        type: "notes",
        x: 0, y: 2, w: 12, h: 4,
        options: { title: "🎯 Focus", content: "# Objectif du jour\n\n---\n\n**Une seule chose importante:**\n\n" },
      },
    ],
  },
];

export async function getLayoutTemplates(): Promise<LayoutTemplate[]> {
  return layoutTemplates;
}

export async function applyLayoutTemplate(
  templateId: string,
  dashboardName?: string
): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

  const template = layoutTemplates.find(t => t.id === templateId);
  if (!template) {
    return { success: false, error: "Template introuvable" };
  }

  try {
    // Create new dashboard
    const newDashboardId = `dash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const slug = (dashboardName || template.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    await db.insert(dashboards).values({
      id: newDashboardId,
      userId: session.user.id,
      name: dashboardName || template.name,
      slug: `${slug}-${Date.now()}`,
      isPublic: false,
      themeConfig: template.themePreset ? { mode: template.themePreset as 'light' | 'dark' | 'oled' } : null,
      customCss: null,
    });

    // Create categories if any
    const categoryMap = new Map<string, string>();
    
    if (template.categories) {
      for (const cat of template.categories) {
        const newCatId = `cat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        await db.insert(categories).values({
          id: newCatId,
          dashboardId: newDashboardId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          order: cat.order,
          isCollapsed: false,
        });

        categoryMap.set(cat.name, newCatId);
      }
    }

    // Create widgets
    for (const widget of template.widgets) {
      const newWidgetId = `widget-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const categoryId = widget.category ? categoryMap.get(widget.category) || null : null;
      
      await db.insert(widgets).values({
        id: newWidgetId,
        dashboardId: newDashboardId,
        categoryId,
        type: widget.type,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        options: widget.options,
      });
    }

    return { success: true, dashboardId: newDashboardId };
  } catch (error) {
    console.error("Template application error:", error);
    return { success: false, error: "Erreur lors de l'application du template" };
  }
}
