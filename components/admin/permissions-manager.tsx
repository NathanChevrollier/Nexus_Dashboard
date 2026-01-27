"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  User, 
  Crown, 
  ShieldCheck, 
  RotateCcw, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { useAlert } from "@/components/ui/confirm-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { 
  getRolePermissions, 
  toggleRolePermission, 
  initializeDefaultPermissions,
  resetRolePermissions,
  type Role 
} from "@/lib/actions/permissions";
import { 
  AVAILABLE_PERMISSIONS, 
  getCategories, 
  getPermissionsByCategory,
  type Permission 
} from "@/lib/constants/permissions";

interface PermissionsState {
  USER: Record<string, boolean>;
  VIP: Record<string, boolean>;
  ADMIN: Record<string, boolean>;
}

export default function PermissionsManager() {
  const alert = useAlert();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<Role>("USER");
  const [permissions, setPermissions] = useState<PermissionsState>({
    USER: {},
    VIP: {},
    ADMIN: {},
  });
  const [updating, setUpdating] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const result = await getRolePermissions();
      
      if (result.error) {
        await alert(result.error);
        return;
      }

      if (result.permissions) {
        const permState: PermissionsState = {
          USER: {},
          VIP: {},
          ADMIN: {},
        };

        // Remplir avec les permissions de la DB
        Object.entries(result.permissions).forEach(([role, perms]) => {
          perms.forEach((perm) => {
            permState[role as Role][perm.permission] = perm.enabled;
          });
        });

        setPermissions(permState);
        setInitialized(Object.values(permState).some(role => Object.keys(role).length > 0));
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
      await alert("Erreur lors du chargement des permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (role: Role, permissionKey: string, enabled: boolean) => {
    if (role === "ADMIN") {
      await alert("Les permissions ADMIN ne peuvent pas être modifiées (toujours actives)");
      return;
    }

    setUpdating(permissionKey);
    try {
      const result = await toggleRolePermission(role, permissionKey, enabled);
      
      if (result.error) {
        await alert(result.error);
        return;
      }

      setPermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [permissionKey]: enabled,
        },
      }));
    } catch (error) {
      console.error("Error toggling permission:", error);
      await alert("Erreur lors de la modification");
    } finally {
      setUpdating(null);
    }
  };

  const handleInitialize = async () => {
    if (!(await confirm("Initialiser les permissions par défaut ? Cela ne supprimera pas vos modifications existantes."))) {
      return;
    }

    setLoading(true);
    try {
      const result = await initializeDefaultPermissions();
      
      if (result.error) {
        await alert(result.error);
        return;
      }

      await alert(`✅ ${result.inserted || 0} permissions initialisées`);
      await loadPermissions();
    } catch (error) {
      console.error("Error initializing permissions:", error);
      await alert("Erreur lors de l'initialisation");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (role: Role) => {
    if (role === "ADMIN") {
      await alert("Le rôle ADMIN ne peut pas être réinitialisé");
      return;
    }

    if (!(await confirm(`Réinitialiser toutes les permissions du rôle ${role} aux valeurs par défaut ?`))) {
      return;
    }

    setLoading(true);
    try {
      const result = await resetRolePermissions(role);
      
      if (result.error) {
        await alert(result.error);
        return;
      }

      await alert(`✅ ${result.message}`);
      await loadPermissions();
    } catch (error) {
      console.error("Error resetting permissions:", error);
      await alert("Erreur lors de la réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "USER": return <User className="h-4 w-4" />;
      case "VIP": return <Crown className="h-4 w-4" />;
      case "ADMIN": return <ShieldCheck className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case "USER": return "secondary";
      case "VIP": return "default";
      case "ADMIN": return "destructive";
    }
  };

  const isPermissionEnabled = (role: Role, permKey: string): boolean => {
    if (role === "ADMIN") return true; // ADMIN a toujours tout
    return permissions[role][permKey] ?? false;
  };

  const categories = getCategories();

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!initialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Permissions non initialisées
          </CardTitle>
          <CardDescription>
            Les permissions doivent être initialisées avant d'être gérées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleInitialize} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Initialiser les permissions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions globales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gestion des permissions par rôle (RBAC)
              </CardTitle>
              <CardDescription className="mt-2">
                Configurez les permissions granulaires pour chaque rôle utilisateur
              </CardDescription>
            </div>
            <Button 
              onClick={handleInitialize} 
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser tout
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs par rôle */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as Role)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="USER" className="flex items-center gap-2">
            {getRoleIcon("USER")}
            USER
            <Badge variant={getRoleBadgeVariant("USER")} className="ml-2">
              {Object.values(permissions.USER).filter(Boolean).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="VIP" className="flex items-center gap-2">
            {getRoleIcon("VIP")}
            VIP
            <Badge variant={getRoleBadgeVariant("VIP")} className="ml-2">
              {Object.values(permissions.VIP).filter(Boolean).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ADMIN" className="flex items-center gap-2">
            {getRoleIcon("ADMIN")}
            ADMIN
            <Badge variant={getRoleBadgeVariant("ADMIN")} className="ml-2">
              Toutes
            </Badge>
          </TabsTrigger>
        </TabsList>

        {(["USER", "VIP", "ADMIN"] as Role[]).map((role) => (
          <TabsContent key={role} value={role} className="space-y-6">
            {/* Info banner pour ADMIN */}
            {role === "ADMIN" && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Les administrateurs ont toutes les permissions
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Les permissions ADMIN ne peuvent pas être modifiées et sont toujours actives.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bouton reset pour USER et VIP */}
            {role !== "ADMIN" && (
              <div className="flex justify-end">
                <Button
                  onClick={() => handleReset(role)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réinitialiser {role}
                </Button>
              </div>
            )}

            {/* Permissions par catégorie */}
            {categories.map((category) => {
              const categoryPerms = getPermissionsByCategory(category);
              
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>
                      {categoryPerms.length} permission{categoryPerms.length > 1 ? "s" : ""} disponible{categoryPerms.length > 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryPerms.map((perm) => {
                        const isEnabled = isPermissionEnabled(role, perm.key);
                        const isUpdating = updating === perm.key;
                        const isDisabled = role === "ADMIN" || isUpdating;

                        return (
                          <div
                            key={perm.key}
                            className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{perm.label}</h4>
                                {isEnabled && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {perm.description}
                              </p>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {perm.key}
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => 
                                  handleTogglePermission(role, perm.key, checked)
                                }
                                disabled={isDisabled}
                              />
                              {isUpdating && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
