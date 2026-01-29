"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIntegrations, upsertIntegration, deleteIntegration } from "@/lib/actions/integrations";
import { Loader2, Plug, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm-provider";
import { SpotifyIntegrationCard } from "./spotify-integration-card";

const INTEGRATION_TYPES = [
  { id: "overseerr", label: "Overseerr / Jellyseerr" },
  { id: "torrent-client", label: "Client Torrent (qBittorrent, Transmission...)" },
  { id: "monitoring", label: "Monitoring (Glances, Prometheus...)" },
  { id: "jellyfin", label: "Jellyfin / Emby (Médiathèque)" },
  { id: "sonarr", label: "Sonarr (Gestion Séries TV)" },
  { id: "radarr", label: "Radarr (Gestion Films)" },
] as const;

interface IntegrationFormState {
  id?: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  username: string;
  password: string;
}

export function IntegrationsSettings() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, { loading?: boolean; ok?: boolean; msg?: string }>>({});
  const [form, setForm] = useState<IntegrationFormState>({
    name: "",
    type: "overseerr",
    baseUrl: "",
    apiKey: "",
    username: "",
    password: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      type: "overseerr",
      baseUrl: "",
      apiKey: "",
      username: "",
      password: "",
    });
  };

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setError(null);
        const data = await getIntegrations();
        setIntegrations(data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des intégrations", error);
        setError("Impossible de charger les intégrations pour le moment.");
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleEdit = (integration: any) => {
    setForm({
      id: integration.id,
      name: integration.name,
      type: integration.type,
      baseUrl: integration.baseUrl || "",
      apiKey: integration.apiKey || "",
      username: integration.username || "",
      password: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Supprimer cette intégration ?"))) return;

    try {
      await deleteIntegration(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setSuccess("Intégration supprimée");
    } catch (error) {
      console.error("Erreur lors de la suppression", error);
      setError("Erreur lors de la suppression de l'intégration.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await upsertIntegration({
        id: form.id,
        name: form.name.trim(),
        type: form.type as any,
        baseUrl: form.baseUrl.trim() || undefined,
        apiKey: form.apiKey.trim() || undefined,
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
      });

      if (result?.success) {
        const data = await getIntegrations();
        setIntegrations(data || []);
        resetForm();
        setSuccess("Intégration enregistrée");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement", error);
      setError("Erreur lors de l'enregistrement de l'intégration.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (integrationId?: string) => {
    const testId = integrationId || 'form';
    setTestStatus(p => ({ ...p, [testId]: { loading: true } }));
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: integrationId || form.id,
          type: integrationId ? undefined : form.type,
          baseUrl: integrationId ? undefined : form.baseUrl,
          apiKey: integrationId ? undefined : form.apiKey,
          username: integrationId ? undefined : form.username,
          password: integrationId ? undefined : form.password,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestStatus(p => ({ ...p, [testId]: { ok: false, msg: json.error || 'Connexion échouée' } }));
        if (!integrationId) setError(json.error || 'Test de connexion échoué');
      } else {
        setTestStatus(p => ({ ...p, [testId]: { ok: true, msg: json.message || 'Connexion réussie' } }));
        if (!integrationId) setSuccess(json.message || 'Connexion réussie');
      }
    } catch (err) {
      console.error('Test intégration error', err);
      setTestStatus(p => ({ ...p, [testId]: { ok: false, msg: 'Erreur de connexion' } }));
      if (!integrationId) setError('Test de connexion échoué');
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <SpotifyIntegrationCard />
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Intégrations & Comptes Externes
        </CardTitle>
        <CardDescription>
          Configurez vos services externes (Overseerr, clients torrent, monitoring...). Les widgets pourront ensuite les utiliser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && !error && (
          <div className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Paramétrage</TabsTrigger>
            <TabsTrigger value="usage">Personnalisation & utilisation</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nom de l'intégration</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Overseerr Maison, Serveur Seedbox..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>URL de base</Label>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="https://overseerr.mondomaine.com"
                />
              </div>

              {form.type === 'overseerr' && (
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder="Clé API Overseerr/Jellyseerr"
                    required
                  />
                </div>
              )}

              {form.type === 'jellyfin' && (
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder="Clé API Jellyfin/Emby"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Créez une clé API dans Dashboard &gt; API Keys (Jellyfin) ou Settings &gt; API Keys (Emby)
                  </p>
                </div>
              )}

              {form.type === 'torrent-client' && (
                <div className="space-y-2">
                  <Label>Nom d'utilisateur</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="Compte qBittorrent/Transmission"
                    required
                  />
                </div>
              )}

              {form.type === 'torrent-client' && (
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mot de passe qBittorrent/Transmission"
                    required
                  />
                </div>
              )}

              {(form.type === 'sonarr' || form.type === 'radarr') && (
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder={`Clé API ${form.type}`}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Trouvez votre clé API dans Settings &gt; General &gt; Security
                  </p>
                </div>
              )}

              <div className="md:col-span-2 flex justify-between gap-2">
                <div>
                  {testStatus.form?.ok === true && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Connexion OK
                    </div>
                  )}
                  {testStatus.form?.ok === false && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      {testStatus.form.msg}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {form.id && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => handleTest()} disabled={testStatus.form?.loading}>
                    {testStatus.form?.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Test...
                      </>
                    ) : (
                      'Tester'
                    )}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {form.id ? "Mettre à jour" : "Ajouter"}
                  </Button>
                </div>
              </div>
            </form>

            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Intégrations configurées
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </div>
            ) : integrations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
                <Plug className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Aucune intégration configurée pour l'instant.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Créez-en une ci-dessus pour commencer.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {integrations.map((integration) => {
                  const testSt = testStatus[integration.id];
                  return (
                    <div
                      key={integration.id}
                      className="rounded-lg border bg-card/50 backdrop-blur-sm p-3 hover:bg-card/70 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{integration.name}</h4>
                            {testSt?.ok === true && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" aria-label="Connexion OK" role="img" />
                            )}
                            {testSt?.ok === false && (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" aria-label={testSt.msg} role="img" />
                            )}
                            {testSt?.loading && (
                              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 animate-spin" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>{INTEGRATION_TYPES.find((t) => t.id === integration.type)?.label || integration.type}</p>
                            {integration.baseUrl && (
                              <p className="truncate" title={integration.baseUrl}>{integration.baseUrl}</p>
                            )}
                            {testSt?.msg && (
                              <p className={testSt.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                {testSt.msg}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTest(integration.id)}
                            disabled={testSt?.loading}
                            className="h-8 px-2 text-xs"
                          >
                            {testSt?.loading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Test...
                              </>
                            ) : (
                              'Tester'
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(integration)} className="h-8 px-2 text-xs">
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(integration.id)}
                            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="usage" className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cette section explique comment vos widgets utilisent les intégrations configurées.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Les widgets comme <span className="font-medium">Demandes médias</span>,
                <span className="font-medium"> Torrent ou Seedbox</span> ou
                <span className="font-medium"> Monitoring</span> vont automatiquement détecter
                les intégrations compatibles.
              </li>
              <li>
                Vous pouvez associer une intégration précise à un widget dans la configuration
                du widget (par exemple choisir quel Overseerr ou quel client torrent utiliser).
              </li>
              <li>
                Pour la <span className="font-medium">Médiathèque</span>, l'intégration Jellyfin ou Emby
                est utilisée pour parcourir et lire votre contenu à distance.
              </li>
            </ul>
            <p>
              En résumé, l'onglet <span className="font-medium">Paramétrage</span> sert à déclarer vos
              serveurs et accès, tandis que la <span className="font-medium">Personnalisation</span> se fait
              dans chaque widget ou page qui consomme ces intégrations.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  );
}
