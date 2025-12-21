import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, widgets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Navbar } from "@/components/dashboard/navbar";

export default async function DashboardSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/login");
  }

  const { slug } = await params;

  // Récupérer tous les dashboards de l'utilisateur
  const userDashboards = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, session.user.id));

  // Trouver le dashboard actuel par slug
  const currentDashboard = userDashboards.find((d) => d.slug === slug);

  if (!currentDashboard) {
    notFound();
  }

  // Récupérer les widgets du dashboard
  const dashboardWidgets = await db
    .select()
    .from(widgets)
    .where(eq(widgets.dashboardId, currentDashboard.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        user={session.user} 
        dashboards={userDashboards}
        currentDashboardId={currentDashboard.id}
      />
      <DashboardView 
        dashboard={currentDashboard}
        isOwner={true}
        initialWidgets={dashboardWidgets}
      />
    </div>
  );
}
