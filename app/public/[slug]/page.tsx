import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dashboards, widgets, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardGridstack } from "@/components/dashboard/dashboard-gridstack";

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  // Récupérer le dashboard public
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(
      and(
        eq(dashboards.slug, slug),
        eq(dashboards.isPublic, true)
      )
    )
    .limit(1);

  if (!dashboard) {
    notFound();
  }

  // Récupérer les widgets du dashboard public
  const dashboardWidgets = await db
    .select()
    .from(widgets)
    .where(eq(widgets.dashboardId, dashboard.id));

  // Récupérer les catégories du dashboard public
  const dashboardCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.dashboardId, dashboard.id))
    .orderBy(categories.order);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">{dashboard.name}</h1>
            <div className="text-sm text-muted-foreground">
              🔗 Dashboard Public (Lecture seule)
            </div>
          </div>
        </div>
      </div>
      
      <DashboardGridstack 
        dashboard={dashboard}
        isOwner={false}
        initialWidgets={dashboardWidgets}
        initialCategories={dashboardCategories}
      />
    </div>
  );
}
