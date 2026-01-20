"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/user-management";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
import AnnouncementsManager from "@/components/admin/announcements-manager";
import { Users, MessageSquare, Shield, Megaphone } from "lucide-react";
import { User } from "@/lib/db/schema";

interface AdminClientPageProps {
  users: User[];
}

export default function AdminClientPage({ users }: AdminClientPageProps) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground mt-2">
          Gérer les utilisateurs, les demandes et les annonces
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="iframe-requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Demandes Iframe
          </TabsTrigger>
          <TabsTrigger value="iframe-allowlist" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Whitelist Iframe
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Annonces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement users={users} />
        </TabsContent>

        <TabsContent value="iframe-requests" className="space-y-4">
          <IframeRequestsAdmin />
        </TabsContent>

        <TabsContent value="iframe-allowlist" className="space-y-4">
          <IframeAllowlistAdmin />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
