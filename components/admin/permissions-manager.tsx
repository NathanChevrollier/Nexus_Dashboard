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
  Info,
  ChevronDown,
  ChevronUp
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
  PERMISSION_DEPENDENCIES,
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
  const [widgetSectionExpanded, setWidgetSectionExpanded] = useState<Record<Role, boolean>>({
    USER: false,
    VIP: false,
    ADMIN: false,
  });
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);

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
        setCurrentUserPermissions(result.currentUserPermissions || []);
        setIsOwner(result.isOwner || false);
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
    setUpdating(permissionKey);
    try {
      // Mise à jour de la permission principale
      const result = await toggleRolePermission(role, permissionKey, enabled);
      
      if (result.error) {
        await alert(result.error);
        return;
      }

      // Créer une copie de l'état des permissions
      const newPermissions = { ...permissions };
      newPermissions[role] = { ...newPermissions[role] };

      // Désactiver les permissions liées si nous décactivons une permission
      if (!enabled && permissionKey === "ACCESS_ADMIN") {
        // Récupérer toutes les permissions qui dépendent de ACCESS_ADMIN
        const dependentPerms = Object.entries(PERMISSION_DEPENDENCIES)
          .filter(([_, deps]) => deps && deps.includes("ACCESS_ADMIN"))
          .map(([perm, _]) => perm);

        // Désactiver les permissions dépendantes côté client immédiatement
        for (const depPerm of dependentPerms) {
          newPermissions[role][depPerm] = false;
          // Appeler le serveur pour désactiver aussi côté base de données
          try {
            await toggleRolePermission(role, depPerm, false);
          } catch (e) {
            console.error(`Erreur lors de la désactivation de ${depPerm}:`, e);
          }
        }

        if (dependentPerms.length > 0) {
          await alert(`✅ ACCESS_ADMIN désactivé. Les ${dependentPerms.length} permissions dépendantes ont été automatiquement désactivées: ${dependentPerms.join(", ")}`);
        }
      }

      // Empêcher d'activer une permission si ses dépendances ne sont pas activées
      if (enabled && PERMISSION_DEPENDENCIES[permissionKey as keyof typeof PERMISSION_DEPENDENCIES]) {
        const requiredPerms = PERMISSION_DEPENDENCIES[permissionKey as keyof typeof PERMISSION_DEPENDENCIES] || [];
        const missingDeps = requiredPerms.filter(dep => !newPermissions[role][dep]);

        if (missingDeps.length > 0) {
          await alert(`⚠️ Impossible d'activer ${permissionKey}. Permissions requises manquantes: ${missingDeps.join(", ")}`);
          setUpdating(null);
          return;
        }
      }

      newPermissions[role][permissionKey] = enabled;
      setPermissions(newPermissions);
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
    if (!isOwner) {
      await alert("Seul le propriétaire peut réinitialiser les permissions");
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
    // Toujours montrer l'état réel de la DB, même pour le owner
    // Le owner peut modifier n'importe quelle permission, mais on affiche l'état DB
    return permissions[role][permKey] ?? false;
  };

  const canModifyPermission = (permKey: string): boolean => {
    // Le owner peut tout modifier
    if (isOwner) return true;
    // Un admin ne peut modifier que les permissions qu'il possède
    return currentUserPermissions.includes(permKey);
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
            {/* Info banner pour les permissions */}
            {!isOwner && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Vous ne pouvez modifier que les permissions que vous possédez
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Les permissions grisées ne peuvent pas être modifiées car vous ne les avez pas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bouton reset pour tous les rôles si owner */}
            {isOwner && (
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
              
              // Si c'est la catégorie Widget, créer un affichage spécial
              if (category === 'Widget') {
                // Séparer les permissions générales des permissions spécifiques aux widgets
                const generalWidgetPerms = categoryPerms.filter(p => 
                  p.key === 'CREATE_WIDGETS' || p.key === 'MANAGE_WIDGETS'
                );
                const specificWidgetPerms = categoryPerms.filter(p => 
                  p.key.startsWith('USE_') && p.key.includes('_WIDGET')
                );

                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <CardDescription>
                        {categoryPerms.length} permission{categoryPerms.length > 1 ? "s" : ""} disponible{categoryPerms.length > 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Permissions générales des widgets */}
                      {generalWidgetPerms.map((perm) => {
                        const isEnabled = isPermissionEnabled(role, perm.key);
                        const isUpdating = updating === perm.key;
                        const canModify = canModifyPermission(perm.key);
                        const isDisabled = !canModify || isUpdating;

                        return (
                          <div
                            key={perm.key}
                            className={`flex items-start justify-between gap-4 p-4 rounded-lg border bg-card ${!canModify ? 'opacity-50' : ''}`}
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{perm.label}</h4>
                                {isEnabled && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {!canModify && (
                                  <Badge variant="secondary" className="text-xs">Verrouillé</Badge>
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

                      {/* Accordéon pour les widgets spécifiques */}
                      {specificWidgetPerms.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setWidgetSectionExpanded(prev => ({
                              ...prev,
                              [role]: !prev[role]
                            }))}
                            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">
                                Widgets individuels ({specificWidgetPerms.length})
                              </span>
                              <Badge variant="secondary">
                                {specificWidgetPerms.filter(p => isPermissionEnabled(role, p.key)).length} actifs
                              </Badge>
                            </div>
                            {widgetSectionExpanded[role] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          
                          {widgetSectionExpanded[role] && (
                            <div className="p-4 space-y-2 bg-background">
                              {specificWidgetPerms.map((perm) => {
                                const isEnabled = isPermissionEnabled(role, perm.key);
                                const isUpdating = updating === perm.key;
                                const canModify = canModifyPermission(perm.key);
                                const isDisabled = !canModify || isUpdating;

                                return (
                                  <div
                                    key={perm.key}
                                    className={`flex items-start justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors ${!canModify ? 'opacity-50' : ''}`}
                                  >
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">{perm.label}</h4>
                                        {isEnabled && (
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        )}
                                        {!canModify && (
                                          <Badge variant="secondary" className="text-xs">Verrouillé</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {perm.description}
                                      </p>
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
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              
              // Pour les autres catégories, affichage normal
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
                        const canModify = canModifyPermission(perm.key);
                        const isDisabled = !canModify || isUpdating;

                        return (
                          <div
                            key={perm.key}
                            className={`flex items-start justify-between gap-4 p-4 rounded-lg border bg-card ${!canModify ? 'opacity-50' : ''}`}
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{perm.label}</h4>
                                {isEnabled && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {!canModify && (
                                  <Badge variant="secondary" className="text-xs">Verrouillé</Badge>
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
