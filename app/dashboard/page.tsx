import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Navbar } from "@/components/dashboard/navbar";

// Simple in-memory cache for dashboard data to reduce DB hits during rapid dev reloads
const DASHBOARD_CACHE_TTL = Number(process.env.DASHBOARD_CACHE_TTL_SECONDS || 5); // seconds
const dashboardCache = new Map<string, { ts: number; payload: any }>();

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/login");
  }

  // Try to serve from cache (per-user)
  const cacheKeyBase = `dash:${session.user.id}`;
  const cached = dashboardCache.get(cacheKeyBase);
  if (cached && (Date.now() - cached.ts) / 1000 < DASHBOARD_CACHE_TTL) {
    const { userDashboards, currentDashboard, dashboardWidgets, dashboardCategories } = cached.payload;
    return (
      <div className="h-full flex flex-col overflow-hidden bg-background">
        <Navbar 
          user={session.user} 
          dashboards={userDashboards}
          currentDashboardId={currentDashboard.id}
        />
        <div className="flex-1 overflow-y-auto">
          <DashboardView 
            dashboard={currentDashboard}
            isOwner={true}
            initialWidgets={dashboardWidgets}
            initialCategories={dashboardCategories}
          />
        </div>
      </div>
    );
  }

  // Récupérer les dashboards de l'utilisateur
  const userDashboards = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, session.user.id));

  // Si aucun dashboard, on en crée un par défaut
  if (userDashboards.length === 0) {
    const defaultDashboard = {
      id: `dash-${Date.now()}`,
      userId: session.user.id,
      name: "Home",
      slug: "home",
      isPublic: false,
      themeConfig: null,
      customCss: null,
    };

    await db.insert(dashboards).values(defaultDashboard);
    userDashboards.push(defaultDashboard as any);
  }

  const currentDashboard = userDashboards[0];

  // Récupérer les widgets du dashboard
  const dashboardWidgets = await db
    .select()
    .from(widgets)
    .where(eq(widgets.dashboardId, currentDashboard.id));

  // Récupérer les catégories du dashboard
  const dashboardCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.dashboardId, currentDashboard.id))
    .orderBy(categories.order);

  // Cache the payload for a short TTL
  try {
    dashboardCache.set(cacheKeyBase, {
      ts: Date.now(),
      payload: { userDashboards, currentDashboard, dashboardWidgets, dashboardCategories }
    });
  } catch (e) {
    // ignore cache errors
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <Navbar 
        user={session.user} 
        dashboards={userDashboards}
        currentDashboardId={currentDashboard.id}
      />
      <div className="flex-1 overflow-y-auto">
        <DashboardView 
          dashboard={currentDashboard}
          isOwner={true}
          initialWidgets={dashboardWidgets}
          initialCategories={dashboardCategories}
        />
      </div>
    </div>
  );
}
