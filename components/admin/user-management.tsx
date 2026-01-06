"use client";

import { useState } from "react";
import IframeRequestsAdmin from "@/components/admin/iframe-requests-admin";
import IframeAllowlistAdmin from "@/components/admin/iframe-allowlist-admin";
import { useSession } from "next-auth/react";
import { User } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Crown, User as UserIcon } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useAlert } from "@/components/ui/confirm-provider";

interface UserManagementProps {
  users: User[];
}

export function UserManagement({ users: initialUsers }: UserManagementProps) {
  const alert = useAlert();
  const confirm = useConfirm();
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

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

  const deleteUser = async (userId: string) => {
    if (!(await confirm('Confirmez-vous la suppression complète de cet utilisateur et de toutes ses données ? Cette action est irréversible.'))) return;
    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const body = await response.json();
      if (response.ok && body.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        console.error('Erreur suppression utilisateur:', body);
        await alert('Erreur lors de la suppression. Voir console.');
      }
    } catch (e) {
      console.error('Erreur suppression utilisateur:', e);
      await alert('Erreur lors de la suppression. Voir console.');
    } finally {
      setLoading(null);
    }
  };

  const resetUser = async (userId: string) => {
    if (!(await confirm("Confirmez-vous la réinitialisation du dashboard de cet utilisateur ? Cela supprimera widgets, dashboards et données d'usage."))) return;
    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const body = await response.json();
      if (response.ok && body.ok) {
        await alert('Réinitialisation effectuée avec succès.');
      } else {
        console.error('Erreur reset utilisateur:', body);
        await alert('Erreur lors de la réinitialisation. Voir console.');
      }
    } catch (e) {
      console.error('Erreur reset utilisateur:', e);
      await alert('Erreur lors de la réinitialisation. Voir console.');
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
      {/* --- Demandes d'iframe (admin) --- */}
      {session?.user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🌐 Demandes d'iframes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <IframeRequestsAdmin />
              </div>
              <div>
                <IframeAllowlistAdmin />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
                      disabled={loading === user.id || user.id === currentUserId}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateUserStatus(user.id, "BANNED")}
                      disabled={loading === user.id || user.id === currentUserId}
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
                    disabled={loading === user.id || user.id === currentUserId}
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
                    disabled={loading === user.id || user.id === currentUserId}
                  >
                    Bannir
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteUser(user.id)}
                    disabled={loading === user.id || user.id === currentUserId}
                  >
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resetUser(user.id)}
                    disabled={loading === user.id || user.id === currentUserId}
                  >
                    Réinitialiser
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
