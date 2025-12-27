"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Shield, Crown, User as UserIcon } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-provider";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "VIP" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "BANNED";
  createdAt: string;
}

export function UserManagementSettings() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setError(null);
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Erreur de chargement");
        const data = await res.json();
        setUsers(data.users || []);
      } catch (e) {
        setError("Impossible de charger les utilisateurs");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const updateUser = async (userId: string, payload: Partial<Pick<User, "status" | "role">>) => {
    setSavingId(userId);
    try {
      setError(null);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      if (!res.ok) throw new Error("Erreur de mise à jour");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...payload } : u)));
    } catch (e) {
      setError("Erreur lors de la mise à jour de l'utilisateur");
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!(await confirm('Confirmez-vous la suppression complète de cet utilisateur et de toutes ses données ? Cette action est irréversible.'))) return;
    setSavingId(userId);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        console.error('Erreur suppression utilisateur:', body);
        alert('Erreur lors de la suppression. Voir console.');
      }
    } catch (e) {
      console.error('Erreur suppression utilisateur:', e);
      alert('Erreur lors de la suppression. Voir console.');
    } finally {
      setSavingId(null);
    }
  };

  const resetUser = async (userId: string) => {
    if (!(await confirm("Confirmez-vous la réinitialisation du dashboard de cet utilisateur ? Cela supprimera widgets, dashboards et données d'usage."))) return;
    setSavingId(userId);
    try {
      const res = await fetch('/api/admin/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        alert('Réinitialisation effectuée avec succès.');
      } else {
        console.error('Erreur reset utilisateur:', body);
        alert('Erreur lors de la réinitialisation. Voir console.');
      }
    } catch (e) {
      console.error('Erreur reset utilisateur:', e);
      alert('Erreur lors de la réinitialisation. Voir console.');
    } finally {
      setSavingId(null);
    }
  };

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const activeUsers = users.filter((u) => u.status === "ACTIVE");
  const bannedUsers = users.filter((u) => u.status === "BANNED");

  const roleBadge = (role: User["role"]) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="destructive" className="gap-1">
            <Shield className="h-3 w-3" /> ADMIN
          </Badge>
        );
      case "VIP":
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" /> VIP
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <UserIcon className="h-3 w-3" /> USER
          </Badge>
        );
    }
  };

  const statusBadge = (status: User["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Actif
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            En attente
          </Badge>
        );
      case "BANNED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Banni
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des utilisateurs</CardTitle>
          <CardDescription>Chargement des utilisateurs...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des utilisateurs</CardTitle>
        <CardDescription>
          Approuvez les nouveaux comptes, gérez les rôles et bannissez ou réactivez des utilisateurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="text-xs text-black bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {pendingUsers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Utilisateurs en attente de validation</span>
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50"
                >
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
                      disabled={savingId === user.id}
                      onClick={() => updateUser(user.id, { status: "ACTIVE" })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={savingId === user.id}
                      onClick={() => updateUser(user.id, { status: "BANNED" })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Utilisateurs actifs</span>
            <Badge variant="secondary">{activeUsers.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{user.name}</p>
                    {roleBadge(user.role)}
                    {statusBadge(user.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={user.role}
                    disabled={savingId === user.id}
                    onChange={(e) =>
                      updateUser(user.id, { role: e.target.value as User["role"] })
                    }
                    className="px-3 py-1.5 border rounded-md text-sm bg-background"
                  >
                    <option value="USER">USER</option>
                    <option value="VIP">VIP</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === user.id}
                    onClick={() => updateUser(user.id, { status: "BANNED" })}
                  >
                    Bannir
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={savingId === user.id}
                    onClick={() => deleteUser(user.id)}
                  >
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingId === user.id}
                    onClick={() => resetUser(user.id)}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {bannedUsers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Utilisateurs bannis</span>
              <Badge variant="secondary">{bannedUsers.length}</Badge>
            </div>
            <div className="space-y-3">
              {bannedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === user.id}
                    onClick={() => updateUser(user.id, { status: "ACTIVE" })}
                  >
                    Réactiver
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
