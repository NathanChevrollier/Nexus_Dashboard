import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ThemeSettingsEnhanced } from "@/components/settings/theme-settings-enhanced";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/login");
  }

  // Récupérer le dashboard actif de l'utilisateur
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">Paramètres</h1>
          <p className="text-muted-foreground">
            Personnalisez votre expérience Nexus Dashboard
          </p>
        </div>
        
        <ThemeSettingsEnhanced user={session.user} dashboardId={currentDashboard.id} />
      </div>
    </div>
  );
}
