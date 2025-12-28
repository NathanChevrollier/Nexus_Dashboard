"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Assure-toi d'avoir ce composant
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assure-toi d'avoir ce composant
import { updateWidget } from "@/lib/actions/widgets";
import { Widget, Category } from "@/lib/db/schema";
import { Loader2, Save, ExternalLink, Globe, Server, Cloud, Film, Download } from "lucide-react";
import { getIntegrations } from "@/lib/actions/integrations";
import { REGIONS, getCitiesByRegion, getCityByName } from "@/lib/cities";
import EmojiPicker from "@/components/ui/emoji-picker";
import AssetPicker from "@/components/ui/asset-picker";
import { useAlert } from "@/components/ui/confirm-provider";

interface EditWidgetDialogProps {
  widget: Widget | null;
  categories: Category[];
  widgets: Widget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWidgetUpdated?: (
    widgetId: string,
    newCategoryId: string | null,
    oldCategoryId: string | null,
    updatedOptions?: any
  ) => void;
}

export function EditWidgetDialog({ widget, categories, widgets, open, onOpenChange, onWidgetUpdated }: EditWidgetDialogProps) {
  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const [options, setOptions] = useState<any>({});
  
  // Data sources
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [availableCities, setAvailableCities] = useState<any[]>([]);

  // Initialisation du formulaire
  useEffect(() => {
    if (widget) {
      setTitle(widget.options?.title || "");
      setCategoryId(widget.categoryId || null);
      setInitialCategoryId(widget.categoryId || null);
      setOptions(widget.options || {});
      
      // Logique spécifique Météo
      if (widget.type === "weather" && (widget.options as any)?.city) {
        const cityData = getCityByName((widget.options as any).city);
        if (cityData) {
          setSelectedRegion(cityData.region);
          setAvailableCities(getCitiesByRegion(cityData.region));
        }
      }

      // Logique spécifique Ping (Migration legacy)
      if (widget.type === "ping") {
        const opts = (widget.options || {}) as any;
        if (!opts.host && opts.targetUrl) {
          try {
            // Tentative d'extraction propre
            const urlStr = opts.targetUrl.startsWith('http') ? opts.targetUrl : `http://${opts.targetUrl}`;
            const parsed = new URL(urlStr);
            setOptions({ 
              ...opts, 
              host: parsed.hostname, 
              port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80') 
            });
          } catch (e) {
            // Fallback
            setOptions({ ...opts, host: opts.targetUrl, port: "80" });
          }
        }
      }
    }
  }, [widget]);

  // Chargement des intégrations uniquement si nécessaire
  useEffect(() => {
    if (!widget) return;
    const integrationWidgets = ["media-requests", "torrent-overview", "monitoring", "calendar"];
    
    if (integrationWidgets.includes(widget.type)) {
      const loadIntegrations = async () => {
        try {
          const data = await getIntegrations();
          setAvailableIntegrations(data || []);
        } catch (e) {
          console.error("Failed to load integrations", e);
        }
      };
      loadIntegrations();
    }
  }, [widget?.type]); // Dépendance corrigée

  const handleSubmit = async () => {
    if (!widget) return;

    setLoading(true);
    try {
      // Nettoyage des options avant envoi (convertir les strings numériques en nombres si besoin)
      const cleanOptions = { ...options, title };
      if (cleanOptions.limit) cleanOptions.limit = parseInt(cleanOptions.limit);

      await updateWidget(widget.id, {
        options: cleanOptions,
        categoryId: categoryId,
      });
      
      onWidgetUpdated?.(widget.id, categoryId, initialCategoryId, cleanOptions);
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur mise à jour:", error);
      await alert("Impossible de mettre à jour le widget.");
    } finally {
      setLoading(false);
    }
  };

  // --- Rendu des champs spécifiques par type de widget ---
  const renderSpecificFields = () => {
    if (!widget) return null;

    switch (widget.type) {
      case "link":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL de destination</Label>
              <Input
                id="url"
                value={options.url || ""}
                onChange={(e) => setOptions({ ...options, url: e.target.value })}
                placeholder="https://google.com"
              />
            </div>
            
            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <Label htmlFor="newTab" className="cursor-pointer">Ouvrir dans un nouvel onglet</Label>
              <Switch
                id="newTab"
                checked={options.openInNewTab || false}
                onCheckedChange={(checked) => setOptions({ ...options, openInNewTab: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Apparence de l'icône</Label>
              <Tabs defaultValue={options.iconUrl ? "custom" : "emoji"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="emoji">Emoji</TabsTrigger>
                  <TabsTrigger value="custom">Image Perso</TabsTrigger>
                </TabsList>
                
                <TabsContent value="emoji" className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">
                      {options.icon || "🔗"}
                    </div>
                    <div className="flex-1">
                      <EmojiPicker 
                        value={options.icon} 
                        onSelect={(emoji) => setOptions({ ...options, icon: emoji, iconUrl: undefined })} 
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="pt-2 space-y-2">
                   <div className="flex gap-2">
                      <Input 
                        placeholder="https://exemple.com/icon.png" 
                        value={options.iconUrl || ""}
                        onChange={(e) => setOptions({...options, iconUrl: e.target.value, icon: undefined})}
                      />
                      {options.iconUrl && (
                        <img src={options.iconUrl} className="h-10 w-10 object-contain rounded border bg-white" alt="Preview" />
                      )}
                   </div>
                   <AssetPicker inline onSelect={(url) => setOptions({ ...options, iconUrl: url, icon: undefined })} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );

      case "ping":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="host">Hôte (IP ou Domaine)</Label>
                <Input
                  id="host"
                  value={options.host || ""}
                  onChange={(e) => setOptions({ ...options, host: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={options.port || ""}
                  onChange={(e) => setOptions({ ...options, port: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Le widget vérifiera la disponibilité de ce service via une requête TCP.
            </p>
          </div>
        );

      case "iframe":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iframeUrl">URL de l'iframe</Label>
              <Input
                id="iframeUrl"
                value={options.url || ""}
                onChange={(e) => setOptions({ ...options, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <Label htmlFor="transparent">Fond transparent</Label>
              <Switch
                id="transparent"
                checked={options.transparent || false}
                onCheckedChange={(checked) => setOptions({ ...options, transparent: checked })}
              />
            </div>
          </div>
        );

      case "weather":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label>Région</Label>
                  <Select 
                    value={selectedRegion} 
                    onValueChange={(region) => {
                      setSelectedRegion(region);
                      const cities = getCitiesByRegion(region);
                      setAvailableCities(cities);
                      if (cities.length > 0) setOptions({ ...options, city: cities[0].name });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label>Ville</Label>
                  <Select 
                    value={options.city || ""} 
                    onValueChange={(city) => setOptions({ ...options, city })}
                    disabled={!selectedRegion}
                  >
                    <SelectTrigger><SelectValue placeholder="Ville" /></SelectTrigger>
                    <SelectContent>
                      {availableCities.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
            </div>
            <div className="space-y-2">
              <Label>Unités</Label>
              <Select value={options.units || "metric"} onValueChange={(v) => setOptions({ ...options, units: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Métrique (°C)</SelectItem>
                  <SelectItem value="imperial">Impérial (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "media-requests":
      case "torrent-overview":
      case "monitoring":
        // Logique générique pour les widgets basés sur une intégration
        const intTypeMap: Record<string, string> = {
          "media-requests": "overseerr",
          "torrent-overview": "torrent-client",
          "monitoring": "monitoring"
        };
        const requiredType = intTypeMap[widget.type];

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intégration source</Label>
              <Select
                value={options.integrationId || "none"}
                onValueChange={(v) => setOptions({ ...options, integrationId: v === 'none' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {availableIntegrations
                    .filter((i) => i.type === requiredType)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options spécifiques Media Requests */}
            {widget.type === "media-requests" && (
               <>
                 <div className="space-y-2">
                   <Label>Filtre de statut</Label>
                   <Select value={options.statusFilter || "all"} onValueChange={(v) => setOptions({...options, statusFilter: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Tout voir</SelectItem>
                       <SelectItem value="pending">En attente uniquement</SelectItem>
                       <SelectItem value="approved">Approuvé uniquement</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Nombre d'éléments (Limite)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="50" 
                      value={options.limit || 10} 
                      onChange={(e) => setOptions({...options, limit: e.target.value})} 
                    />
                 </div>
               </>
            )}

             {/* Options spécifiques Torrents */}
             {widget.type === "torrent-overview" && (
               <div className="space-y-2">
                  <Label>Limite d'affichage</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={options.limit || 5} 
                    onChange={(e) => setOptions({...options, limit: e.target.value})} 
                  />
               </div>
            )}
          </div>
        );

      default:
        return <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded">Ce widget n'a pas d'options avancées.</div>;
    }
  };

  if (!widget) return null;

  // Icône dynamique selon le type
  const WidgetIcon = {
      link: Globe,
      ping: Server,
      weather: Cloud,
      "media-requests": Film,
      "torrent-overview": Download
  }[widget.type] || Globe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <WidgetIcon className="h-5 w-5 text-primary" />
             Modifier le Widget
          </DialogTitle>
          <DialogDescription>
             Configuration du widget de type <span className="font-mono bg-muted px-1 rounded text-foreground">{widget.type}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Section Générale */}
          <div className="grid gap-4 p-4 border rounded-lg bg-card/50">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Paramètres Généraux</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre (Optionnel)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mon Widget"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Grille Principale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🏠 Grille principale</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section Spécifique */}
          <div className="grid gap-4">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                Configuration Spécifique
                <span className="text-xs font-normal normal-case text-muted-foreground">Options dédiées au module</span>
             </h3>
             {renderSpecificFields()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les modifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}