import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ThemeSettingsEnhanced } from "@/components/settings/theme-settings-enhanced";
import { AccountSettings } from "@/components/settings/account-settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Palette, Plug, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      
      {/* Fond décoratif subtil (Grid Pattern) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header simplifié et propre */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
          <div className="space-y-1.5">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour au tableau de bord
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">
              Gérez les préférences de votre application et de votre compte.
            </p>
          </div>

          {/* User Badge Minimaliste */}
          <div className="flex items-center gap-3 bg-card border rounded-full pl-1 pr-4 py-1 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-none">{session.user.name}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1 uppercase tracking-wide">
                {session.user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Style "Underline" moderne */}
        <Tabs defaultValue="appearance" className="space-y-8">
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 sm:-mx-0 sm:px-0">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 space-x-6 overflow-x-auto no-scrollbar">
              <TabTrigger value="appearance" icon={Palette} label="Apparence" />
              <TabTrigger value="integrations" icon={Plug} label="Intégrations" />
              {session.user.role === "ADMIN" && (
                <TabTrigger value="users" icon={Users} label="Utilisateurs" />
              )}
              <TabTrigger value="account" icon={ShieldCheck} label="Compte" />
            </TabsList>
          </div>

          <div className="grid gap-6">
            <TabsContent value="appearance" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
               {/* Conteneur avec style unifié */}
               <SettingsSection title="Personnalisation" description="Gérez le thème et l'apparence de votre dashboard.">
                  <ThemeSettingsEnhanced user={{ role: session.user.role as any }} dashboardId={currentDashboard.id} />
               </SettingsSection>
            </TabsContent>

            <TabsContent value="integrations" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <SettingsSection title="Services Connectés" description="Gérez vos connexions aux services tiers (Overseerr, Plex, etc).">
                <IntegrationsSettings />
              </SettingsSection>
            </TabsContent>

            {session.user.role === "ADMIN" && (
              <TabsContent value="users" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <SettingsSection title="Gestion d'équipe" description="Invitez et gérez les membres de votre instance.">
                  <UserManagementSettings />
                </SettingsSection>
              </TabsContent>
            )}

            <TabsContent value="account" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <SettingsSection title="Mon Profil" description="Vos informations personnelles et sécurité.">
                <AccountSettings />
              </SettingsSection>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Composants utilitaires pour la lisibilité
function TabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none",
        "data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none",
        "hover:text-foreground hover:bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
    </TabsTrigger>
  );
}

function SettingsSection({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        {children}
      </div>
    </div>
  );
}