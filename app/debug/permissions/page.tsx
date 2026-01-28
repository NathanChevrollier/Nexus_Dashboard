'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Shield, Zap, Lock, 
  CheckCircle, XCircle, AlertCircle, Copy, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { PERMISSION_DEPENDENCIES, AVAILABLE_PERMISSIONS } from '@/lib/constants/permissions';
import { getRolePermissions } from '@/lib/actions/permissions';
import type { Role } from '@/lib/actions/permissions';

const ROLES: Role[] = ['USER', 'VIP', 'ADMIN'];

export default function DebugPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('USER');
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<Role, Record<string, boolean>>>({
    USER: {},
    VIP: {},
    ADMIN: {},
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les permissions RÉELLES depuis le serveur
  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const result = await getRolePermissions();
        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.permissions) {
          const permMap: Record<Role, Record<string, boolean>> = {
            USER: {},
            VIP: {},
            ADMIN: {},
          };

          // Remplir à partir des données du serveur
          Object.entries(result.permissions).forEach(([role, perms]) => {
            perms.forEach((perm) => {
              permMap[role as Role][perm.permission] = perm.enabled;
            });
          });

          // Remplir les permissions non configurées avec false
          AVAILABLE_PERMISSIONS.forEach((p) => {
            ROLES.forEach((role) => {
              if (!(p.key in permMap[role])) {
                permMap[role][p.key] = false;
              }
            });
          });

          setRolePermissionsMap(permMap);
        }
      } catch (err) {
        console.error('Erreur chargement perms:', err);
        setError('Erreur lors du chargement des permissions');
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  // Copier dans le clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Grouper les permissions par catégorie
  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  // Permissions du rôle sélectionné
  const selectedPermissions = rolePermissionsMap[selectedRole] || {};

  // Vérifier si ACCESS_ADMIN est activé pour le rôle sélectionné
  const hasAccessAdmin = selectedPermissions['ACCESS_ADMIN'] ?? false;

  // Calculer les permissions dépendantes
  const getDependentPermissions = (permKey: string) => {
    return Object.entries(PERMISSION_DEPENDENCIES)
      .filter(([_, deps]) => deps && deps.includes(permKey))
      .map(([key]) => key);
  };

  // Permissions qui seraient bloquées si ACCESS_ADMIN est désactivé
  const adminDependentPerms = getDependentPermissions('ACCESS_ADMIN');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Chargement des permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">🔐 Debug Permissions</h1>
            <Badge variant="outline">Dev Mode</Badge>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">🔐 Debug Permissions</h1>
              <p className="text-sm text-muted-foreground">Vérifiez les permissions réelles du système</p>
            </div>
          </div>
          <Badge variant="outline">Dev Mode</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Sélecteur de rôle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Sélecteur de Rôle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === role
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold text-lg">{role}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedRole === role && '✓ Sélectionné'}
                  </div>
                </button>
              ))}
            </div>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-blue-900">
                    Les données affichées proviennent de votre base de données réelle.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Onglets */}
        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permissions">📋 Permissions</TabsTrigger>
            <TabsTrigger value="access">🚪 Accès & Admin</TabsTrigger>
          </TabsList>

          {/* Onglet Permissions */}
          <TabsContent value="permissions" className="space-y-6">
            {/* Résumé */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {Object.values(selectedPermissions).filter(Boolean).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Activées</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {hasAccessAdmin ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-muted-foreground">Admin</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-500">
                      {Object.entries(selectedPermissions).filter(([k, v]) => k.startsWith('USE_') && v).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Widgets</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions par catégorie */}
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {perms.map(perm => {
                      const isEnabled = selectedPermissions[perm.key] ?? false;
                      const dependents = getDependentPermissions(perm.key);

                      return (
                        <div
                          key={perm.key}
                          className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{perm.label}</span>
                                {isEnabled ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">
                                  {perm.key}
                                </Badge>
                                {dependents.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-700">
                                    ⬇️ {dependents.length}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {isEnabled && (
                                <Badge className="bg-green-500/20 text-green-700">Actif</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Onglet Accès */}
          <TabsContent value="access" className="space-y-6">
            {/* Panel Admin */}
            <Card className={!hasAccessAdmin ? 'opacity-60 bg-muted/30' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Accès Panel Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg border ${hasAccessAdmin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      {hasAccessAdmin ? (
                        <p className="text-green-700"><strong>✓</strong> Accès autorisé au panel (/admin)</p>
                      ) : (
                        <p className="text-red-700"><strong>✗</strong> Accès REFUSÉ</p>
                      )}
                    </div>
                  </div>
                </div>

                {hasAccessAdmin && adminDependentPerms.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">Permissions d'admin:</p>
                    <div className="grid gap-2">
                      {adminDependentPerms.map(permKey => {
                        const perm = AVAILABLE_PERMISSIONS.find(p => p.key === permKey);
                        const isEnabled = selectedPermissions[permKey] ?? false;
                        if (!perm) return null;
                        return (
                          <div 
                            key={permKey} 
                            className={`flex items-center gap-2 p-2 rounded border ${
                              isEnabled 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-muted/30 border-border'
                            }`}
                          >
                            {isEnabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{perm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!hasAccessAdmin && adminDependentPerms.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-amber-700">Requiert ACCESS_ADMIN:</p>
                    <div className="grid gap-2">
                      {adminDependentPerms.map(permKey => {
                        const perm = AVAILABLE_PERMISSIONS.find(p => p.key === permKey);
                        if (!perm) return null;
                        return (
                          <div key={permKey} className="flex items-center gap-2 p-2 rounded border bg-amber-50 border-amber-200">
                            <XCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-sm text-amber-700">{perm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dépendances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Dépendances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(PERMISSION_DEPENDENCIES).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_DEPENDENCIES).map(([permKey, deps]) => {
                      if (!deps || deps.length === 0) return null;
                      const perm = AVAILABLE_PERMISSIONS.find(p => p.key === permKey);
                      if (!perm) return null;
                      return (
                        <div key={permKey} className="p-3 rounded border bg-muted/30">
                          <div className="font-semibold text-sm mb-2">{perm.label}</div>
                          <div className="text-xs text-muted-foreground ml-2">
                            Requiert: {deps.join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune dépendance configurée</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[300px]">
{JSON.stringify({
  role: selectedRole,
  timestamp: new Date().toISOString(),
  permissions: Object.entries(selectedPermissions)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key),
  stats: {
    total: Object.values(selectedPermissions).filter(Boolean).length,
    widgets: Object.entries(selectedPermissions).filter(([k, v]) => k.startsWith('USE_') && v).length,
    admin: hasAccessAdmin,
  }
}, null, 2)}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(JSON.stringify(selectedPermissions, null, 2))}
              >
                {copiedText ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedText ? 'Copié!' : 'Copier'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-blue-900">
            <p>✓ Données chargées de la base de données</p>
            <p>✓ Sélecteur de rôle pour visualiser les permissions</p>
            <p>✓ Dépendances appliquées lors des modifications</p>
            <p>✓ Blocages appliqués côté serveur</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
