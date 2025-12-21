import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardView } from "@/components/dashboard/dashboard-view";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{dashboard.name}</h1>
            <div className="text-sm text-muted-foreground">
              🔗 Dashboard Public (Lecture seule)
            </div>
          </div>
        </div>
      </div>
      
      <DashboardView 
        dashboard={dashboard}
        isOwner={false}
      />
    </div>
  );
}
