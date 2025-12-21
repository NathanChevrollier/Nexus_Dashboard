"use client";

import { useState } from "react";
import { User } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Crown, User as UserIcon } from "lucide-react";

interface UserManagementProps {
  users: User[];
}

export function UserManagement({ users: initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);

  const updateUserStatus = async (userId: string, status: "PENDING" | "ACTIVE" | "BANNED") => {
    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    } finally {
      setLoading(null);
    }
  };

  const updateUserRole = async (userId: string, role: "USER" | "VIP" | "ADMIN") => {
    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    } finally {
      setLoading(null);
    }
  };

  const pendingUsers = users.filter(u => u.status === "PENDING");
  const activeUsers = users.filter(u => u.status === "ACTIVE");
  const bannedUsers = users.filter(u => u.status === "BANNED");

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" /> ADMIN</Badge>;
      case "VIP":
        return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> VIP</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><UserIcon className="h-3 w-3" /> USER</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actif</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
      case "BANNED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Banni</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Utilisateurs en attente */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⏳ Utilisateurs en attente de validation
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inscription: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => updateUserStatus(user.id, "ACTIVE")}
                      disabled={loading === user.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateUserStatus(user.id, "BANNED")}
                      disabled={loading === user.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utilisateurs actifs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✅ Utilisateurs actifs
            <Badge variant="secondary">{activeUsers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{user.name}</p>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value as "USER" | "VIP" | "ADMIN")}
                    disabled={loading === user.id}
                    className="px-3 py-1.5 border rounded-md text-sm bg-background"
                  >
                    <option value="USER">USER</option>
                    <option value="VIP">VIP</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUserStatus(user.id, "BANNED")}
                    disabled={loading === user.id}
                  >
                    Bannir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Utilisateurs bannis */}
      {bannedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚫 Utilisateurs bannis
              <Badge variant="secondary">{bannedUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bannedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50/50">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUserStatus(user.id, "ACTIVE")}
                    disabled={loading === user.id}
                  >
                    Réactiver
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
