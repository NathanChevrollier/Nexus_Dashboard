"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Plug, Users, ShieldCheck } from "lucide-react";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { AccountSettings } from "@/components/settings/account-settings";
import ContactSettings from "@/components/settings/contact-settings";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
import { cn } from "@/lib/utils";

export default function SettingsTabs({ userRole, dashboardId }: { userRole: string; dashboardId: string }) {
  const [tab, setTab] = useState<string>("appearance");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("settingsTab");
      if (saved) setTab(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("settingsTab", tab); } catch (e) {}
  }, [tab]);

  function TabTrigger({ value, icon: Icon, label }: { value: string; icon: any; label: string }) {
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

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v)} className="space-y-8">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 sm:-mx-0 sm:px-0">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 space-x-6 overflow-x-auto no-scrollbar">
          <TabTrigger value="appearance" icon={Palette} label="Apparence" />
          <TabTrigger value="integrations" icon={Plug} label="Intégrations" />
          <TabTrigger value="account" icon={ShieldCheck} label="Compte" />
          <TabTrigger value="contact" icon={Users} label="Contact" />
          {userRole === "ADMIN" && <TabTrigger value="users" icon={Users} label="Gestion Admin" />}
        </TabsList>
      </div>

      <div className="grid gap-6">
        <TabsContent value="appearance" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">Personnalisation</h3>
              <p className="text-sm text-muted-foreground">Gérez le thème et l'apparence de votre dashboard.</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <ThemeSettings />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">Services Connectés</h3>
              <p className="text-sm text-muted-foreground">Gérez vos connexions aux services tiers (Overseerr, Plex, etc).</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <IntegrationsSettings />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="account" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">Mon Profil</h3>
              <p className="text-sm text-muted-foreground">Vos informations personnelles et sécurité.</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <AccountSettings />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">Contact & Signalement</h3>
              <p className="text-sm text-muted-foreground">Envoyez un retour, une suggestion, ou signalez un bug. Les messages seront transmis via webhook Discord.</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
              <ContactSettings />
            </div>
          </div>
        </TabsContent>

        {userRole === "ADMIN" && (
          <TabsContent value="users" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-medium">Gestion d'équipe</h3>
                <p className="text-sm text-muted-foreground">Approuvez les comptes, gérez les rôles et les statuts des utilisateurs.</p>
              </div>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
                <UserManagementSettings />
              </div>

              <div className="mt-6">
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-medium">Gestion des iframes</h3>
                    <p className="text-sm text-muted-foreground">Traitez les demandes d'autorisation d'iframe et gérez la allowlist d'origines.</p>
                  </div>
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium">Demandes en attente</h4>
                        <div className="mt-2"><IframeRequestsAdmin /></div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Allowlist</h4>
                        <div className="mt-2"><IframeAllowlistAdmin /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
