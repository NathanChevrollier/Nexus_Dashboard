'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  User, 
  Palette, 
  Settings as SettingsIcon, 
  LogOut,
  CreditCard,
  Bell,
  Puzzle,
  ArrowLeft,
  MessageSquare,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "next-auth/react";

// Import des sous-composants
import { AccountSettings } from "@/components/settings/account-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import ContactSettings from "@/components/settings/contact-settings";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("appearance");
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  const menuItems = [
    { id: "account", label: "Mon Compte", icon: User },
    { id: "appearance", label: "Apparence", icon: Palette },
    { id: "integrations", label: "Intégrations", icon: Puzzle },
    { id: "contact", label: "Contact", icon: MessageSquare },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
  ];

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
          {menuItems.map((item, index) => (
            <div key={item.id}>
              {item.id === "admin" && (
                <Separator className="my-3" />
              )}
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.id === "admin" && "bg-destructive/10 hover:bg-destructive/20 border border-destructive/30"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            </div>
          ))}
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
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(item.id)}
                  className="whitespace-nowrap"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              ))}
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

            {activeTab === "admin" && isAdmin && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Administration</h1>
                  <p className="text-muted-foreground">Gérez les utilisateurs, rôles et autorisations iframe.</p>
                </div>
                <Separator className="mb-6" />
                <div className="space-y-6">
                  <UserManagementSettings />
                  
                  <Separator className="my-6" />
                  
                  <IframeRequestsAdmin />
                  
                  <IframeAllowlistAdmin />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}