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
import SettingsTabs from "@/components/settings/settings-tabs";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
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
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
          <div className="space-y-1.5">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour au tableau de bord
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">Gérez les préférences de votre application et de votre compte.</p>
          </div>

          <div className="flex items-center gap-3 bg-card border rounded-full pl-1 pr-4 py-1 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-none">{session.user.name}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1 uppercase tracking-wide">{session.user.role}</span>
            </div>
          </div>
        </div>

        {/* Client-side tabs (persist active tab) */}
        <SettingsTabs userRole={session.user.role} dashboardId={currentDashboard.id} />
      </div>
    </div>
  );
}

// Composants utilitaires pour la lisibilité
// The tabs UI is implemented in `components/settings/settings-tabs.tsx` (client-side)