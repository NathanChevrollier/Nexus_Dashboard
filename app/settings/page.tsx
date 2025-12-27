import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ThemeSettingsEnhanced } from "@/components/settings/theme-settings-enhanced";
import { AccountSettings } from "@/components/settings/account-settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Palette, Plug, Settings as SettingsIcon } from "lucide-react";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementSettings } from "@/components/settings/user-management-settings";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header avec effet glassmorphism */}
      <div className="border-b bg-gradient-to-br from-card/50 via-background to-card/30 backdrop-blur-xl shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/50">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
              </Link>
              <div className="hidden sm:block h-8 w-px bg-border/50" />
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <SettingsIcon className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Paramètres
                  </h1>
                  <p className="text-xs text-muted-foreground/80">
                    Personnalisez votre expérience
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-lg border border-border/30 backdrop-blur-sm text-xs sm:text-sm">
              <span className="font-medium text-foreground hidden sm:inline">{session.user.name}</span>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30">
                {session.user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 max-w-5xl">
        <Tabs defaultValue="appearance" className="mt-2">
          <TabsList className="mb-6 bg-card/50 backdrop-blur-sm border border-border/50 p-1 grid grid-cols-2 sm:grid-cols-4 w-full gap-1">
            <TabsTrigger 
              value="appearance" 
              className="gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
            >
              <Palette className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden sm:inline">Apparence</span>
            </TabsTrigger>
            <TabsTrigger 
              value="integrations"
              className="gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
            >
              <Plug className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden sm:inline">Intégrations</span>
            </TabsTrigger>
            {session.user.role === "ADMIN" && (
              <TabsTrigger 
                value="users" 
                className="gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
              >
                <Users className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="account"
              className="gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
            >
              <SettingsIcon className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden sm:inline">Compte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
              <ThemeSettingsEnhanced user={session.user} dashboardId={currentDashboard.id} />
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
              <IntegrationsSettings />
            </div>
          </TabsContent>

          {session.user.role === "ADMIN" && (
            <TabsContent value="users" className="space-y-6">
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
                <UserManagementSettings />
              </div>
            </TabsContent>
          )}

          <TabsContent value="account" className="space-y-6">
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
              <AccountSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
