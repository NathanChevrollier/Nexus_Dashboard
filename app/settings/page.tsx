'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  User, 
  Users,
  Palette, 
  Settings as SettingsIcon, 
  LogOut,
  Puzzle,
  ArrowLeft,
  MessageSquare,
  Megaphone,
  List,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSession, signOut } from "next-auth/react";

// Import des sous-composants
import { AccountSettings } from "@/components/settings/account-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import ContactSettings from "@/components/settings/contact-settings";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";
import AnnouncementsManager from "@/components/admin/announcements-manager";
import PermissionsManager from "@/components/admin/permissions-manager";

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: "user" | "admin";
  badge?: string;
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("appearance");
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  // Menu items avec sections admin intégrées
  const menuItems: MenuItem[] = [
    { id: "account", label: "Mon Compte", icon: User, section: "user" },
    { id: "appearance", label: "Apparence", icon: Palette, section: "user" },
    { id: "integrations", label: "Intégrations", icon: Puzzle, section: "user" },
    { id: "contact", label: "Contact", icon: MessageSquare, section: "user" },
    ...(isAdmin ? [
      { id: "admin-users", label: "Utilisateurs", icon: Users, section: "admin" as const, badge: "Admin" },
      { id: "admin-permissions", label: "Permissions", icon: ShieldCheck, section: "admin" as const, badge: "Admin" },
      { id: "admin-iframe", label: "Iframe", icon: List, section: "admin" as const },
      { id: "admin-announcements", label: "Patch Notes", icon: Megaphone, section: "admin" as const },
    ] : []),
  ];
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r bg-card/30 backdrop-blur-sm flex flex-col hidden md:flex">
        <div className="p-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Retour au dashboard
          </Link>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Paramètres
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos préférences</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isFirstAdminItem = item.section === "admin" && (index === 0 || menuItems[index - 1]?.section !== "admin");
            
            return (
              <div key={item.id}>
                {isFirstAdminItem && (
                  <Separator className="my-3" />
                )}
                <button
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                    item.section === "admin" 
                      ? isActive
                        ? "bg-destructive/20 text-destructive border-2 border-destructive/50 shadow-md shadow-destructive/20"
                        : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-destructive/30 hover:border-destructive/50"
                      : isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  {item.badge && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/50 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {session?.user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-background/50">
        <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
          
          {/* Bouton retour mobile */}
          <div className="md:hidden">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </Link>
          </div>

          <div className="md:hidden mb-6">
            {/* Mobile Nav (Simplifiée) */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isAdminItem = item.section === "admin";
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? (isAdminItem ? "destructive" : "default") : "outline"}
                    size="sm"
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "whitespace-nowrap relative",
                      isAdminItem && activeTab !== item.id && "border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                    {item.badge && (
                      <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0 h-4">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "account" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Mon Compte</h1>
                  <p className="text-muted-foreground">Gérez vos informations personnelles et votre sécurité.</p>
                </div>
                <Separator className="mb-6" />
                <AccountSettings />
              </>
            )}

            {activeTab === "appearance" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Apparence</h1>
                  <p className="text-muted-foreground">Personnalisez l'interface du Nexus Dashboard.</p>
                </div>
                <Separator className="mb-6" />
                <ThemeSettings />
              </>
            )}

            {activeTab === "integrations" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Intégrations</h1>
                  <p className="text-muted-foreground">Connectez vos services tiers (TMDb, AniList, *arr...).</p>
                </div>
                <Separator className="mb-6" />
                <IntegrationsSettings />
              </>
            )}

            {activeTab === "contact" && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Contact & Support</h1>
                  <p className="text-muted-foreground">Envoyez-nous vos suggestions, questions ou signalez un bug.</p>
                </div>
                <Separator className="mb-6" />
                <ContactSettings />
              </>
            )}

            {activeTab === "admin-users" && isAdmin && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
                    <Badge variant="destructive">Admin</Badge>
                  </div>
                  <p className="text-muted-foreground">Gérez les comptes utilisateurs, rôles et permissions.</p>
                </div>
                <Separator className="mb-6" />
                <UserManagementSettings />
              </>
            )}

            {activeTab === "admin-permissions" && isAdmin && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Gestion des Permissions (RBAC)</h1>
                    <Badge variant="destructive">Admin</Badge>
                  </div>
                  <p className="text-muted-foreground">Configurez les permissions granulaires par rôle utilisateur.</p>
                </div>
                <Separator className="mb-6" />
                <PermissionsManager />
              </>
            )}

            {activeTab === "admin-iframe" && isAdmin && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Gestion Iframe</h1>
                    <Badge variant="destructive">Admin</Badge>
                  </div>
                  <p className="text-muted-foreground">Gérez les demandes d'iframe et la whitelist.</p>
                </div>
                <Separator className="mb-6" />
                <div className="space-y-8">
                  <section>
                    <h3 className="text-lg font-semibold mb-4">Demandes Iframe en attente</h3>
                    <IframeRequestsAdmin />
                  </section>
                  <Separator />
                  <section>
                    <h3 className="text-lg font-semibold mb-4">Whitelist Iframe</h3>
                    <IframeAllowlistAdmin />
                  </section>
                </div>
              </>
            )}

            {activeTab === "admin-announcements" && isAdmin && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Patch Notes & Annonces</h1>
                    <Badge variant="destructive">Admin</Badge>
                  </div>
                  <p className="text-muted-foreground">Publiez des annonces et patch notes pour tous les utilisateurs.</p>
                </div>
                <Separator className="mb-6" />
                <AnnouncementsManager />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
