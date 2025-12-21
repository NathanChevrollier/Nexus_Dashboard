"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIntegrations, upsertIntegration, deleteIntegration } from "@/lib/actions/integrations";
import { Loader2, Plug, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INTEGRATION_TYPES = [
  { id: "overseerr", label: "Overseerr / Jellyseerr" },
  { id: "torrent-client", label: "Client Torrent (qBittorrent, Transmission...)" },
  { id: "monitoring", label: "Monitoring (Glances, Prometheus...)" },
  { id: "jellyfin", label: "Jellyfin / Emby (Médiathèque)" },
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    if (!confirm("Supprimer cette intégration ?")) return;

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

  return (
    <Card className="mt-8">
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

              <div className="space-y-2">
                <Label>Clé API (si applicable)</Label>
                <Input
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder="Clé API secrète (Overseerr...)"
                />
              </div>

              <div className="space-y-2">
                <Label>Nom d'utilisateur (optionnel)</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="Pour clients torrent nécessitant une connexion"
                />
              </div>

              <div className="space-y-2">
                <Label>Mot de passe (optionnel)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Ne sera enregistré que côté serveur"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                {form.id && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler la modification
                  </Button>
                )}
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.id ? "Mettre à jour" : "Ajouter l'intégration"}
                </Button>
              </div>
            </form>

            <div>
              <h3 className="text-sm font-medium mb-2">Intégrations configurées</h3>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : integrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune intégration configurée pour l'instant.
                </p>
              ) : (
                <ul className="space-y-2">
                  {integrations.map((integration) => (
                    <li
                      key={integration.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {INTEGRATION_TYPES.find((t) => t.id === integration.type)?.label || integration.type}
                          {integration.baseUrl ? ` • ${integration.baseUrl}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(integration)}>
                          Modifier
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(integration.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cette section explique comment vos widgets utilisent les intégrations configurées.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Les widgets comme <span className="font-medium">Demandes médias</span>,
                <span className="font-medium"> Torrent / Seedbox</span> ou
                <span className="font-medium"> Monitoring</span> vont automatiquement détecter
                les intégrations compatibles.
              </li>
              <li>
                Vous pouvez associer une intégration précise à un widget dans la configuration
                du widget (par exemple choisir quel Overseerr ou quel client torrent utiliser).
              </li>
              <li>
                Pour la <span className="font-medium">Médiathèque</span>, l'intégration Jellyfin / Emby
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
  );
}
