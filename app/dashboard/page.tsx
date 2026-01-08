import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Navbar } from "@/components/dashboard/navbar";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/login");
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
