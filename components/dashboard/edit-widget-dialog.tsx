"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateWidget } from "@/lib/actions/widgets";
import { Widget, Category } from "@/lib/db/schema";
import { Loader2, Save, Globe, Server, Cloud, Film, Download, StickyNote, Clock } from "lucide-react";
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

export function EditWidgetDialog({ widget, categories, open, onOpenChange, onWidgetUpdated }: EditWidgetDialogProps) {
  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  
  // State
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
      
      // Logique Météo
      if (widget.type === "weather" && (widget.options as any)?.city) {
        const cityData = getCityByName((widget.options as any).city);
        if (cityData) {
          setSelectedRegion(cityData.region);
          setAvailableCities(getCitiesByRegion(cityData.region));
        }
      }

      // Logique Ping (Migration)
      if (widget.type === "ping") {
        const opts = (widget.options || {}) as any;
        if (!opts.host && opts.targetUrl) {
          try {
            const urlStr = opts.targetUrl.startsWith('http') ? opts.targetUrl : `http://${opts.targetUrl}`;
            const parsed = new URL(urlStr);
            setOptions({ 
              ...opts, 
              host: parsed.hostname, 
              port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80') 
            });
          } catch (e) {
            setOptions({ ...opts, host: opts.targetUrl, port: "80" });
          }
        }
      }
    }
  }, [widget]);

  // Chargement des intégrations
  useEffect(() => {
    if (!widget) return;
    const integrationWidgets = ["media-requests", "torrent-overview", "monitoring"];
    
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
  }, [widget?.type]);

  const handleSubmit = async () => {
    if (!widget) return;

    setLoading(true);
    try {
      // Nettoyage des types
      const cleanOptions = { ...options, title };
      
      // Conversion des nombres
      ['limit', 'limitActive', 'pomodoroMinutes', 'shortBreakMinutes', 'longBreakMinutes'].forEach(key => {
        if (cleanOptions[key]) cleanOptions[key] = Number(cleanOptions[key]);
      });

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

  // Rendu des champs spécifiques
  const renderSpecificFields = () => {
    if (!widget) return null;

    switch (widget.type) {
      case "link":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL de destination</Label>
              <Input
                value={options.url || ""}
                onChange={(e) => setOptions({ ...options, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Icône</Label>
              <Tabs defaultValue={options.iconUrl ? "custom" : "emoji"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="emoji">Emoji</TabsTrigger>
                  <TabsTrigger value="custom">Image Perso</TabsTrigger>
                </TabsList>
                
                <TabsContent value="emoji" className="pt-2 flex gap-3">
                    <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">{options.icon || "🔗"}</div>
                    <div className="flex-1">
                      <EmojiPicker value={options.icon} onSelect={(e) => setOptions({ ...options, icon: e, iconUrl: undefined })} />
                    </div>
                </TabsContent>
                
                <TabsContent value="custom" className="pt-2 space-y-2">
                   <div className="flex gap-2">
                      <Input placeholder="https://..." value={options.iconUrl || ""} onChange={(e) => setOptions({...options, iconUrl: e.target.value, icon: undefined})} />
                      {options.iconUrl && <img src={options.iconUrl} className="h-10 w-10 object-contain bg-white rounded border" alt="Preview" />}
                   </div>
                   <AssetPicker inline onSelect={(url) => setOptions({ ...options, iconUrl: url, icon: undefined })} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <Label htmlFor="newTab" className="cursor-pointer">Ouvrir dans un nouvel onglet</Label>
              <Switch
                id="newTab"
                checked={options.openInNewTab || false}
                onCheckedChange={(checked) => setOptions({ ...options, openInNewTab: checked })}
              />
            </div>
          </div>
        );

      case "link-ping":
         return (
            <div className="space-y-4">
               <div className="space-y-2">
                 <Label>URL (avec port si nécessaire)</Label>
                 <Input value={options.url || ""} onChange={(e) => setOptions({ ...options, url: e.target.value })} placeholder="https://..." />
               </div>
               
               {/* AJOUT SÉLECTEUR ICÔNE POUR LINK-PING */}
               <div className="space-y-2">
                  <Label>Icône</Label>
                  <Tabs defaultValue={options.iconUrl ? "custom" : "emoji"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="emoji">Emoji</TabsTrigger>
                      <TabsTrigger value="custom">Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emoji" className="pt-2 flex gap-3">
                       <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">{options.icon || "⚡"}</div>
                       <div className="flex-1"><EmojiPicker value={options.icon} onSelect={e => setOptions({...options, icon: e, iconUrl: undefined})} /></div>
                    </TabsContent>
                    <TabsContent value="custom" className="pt-2 space-y-2">
                       <div className="flex gap-2">
                          <Input placeholder="https://..." value={options.iconUrl || ""} onChange={e => setOptions({...options, iconUrl: e.target.value, icon: undefined})} />
                          {options.iconUrl && <img src={options.iconUrl} className="h-10 w-10 object-contain bg-white rounded border" alt="Preview" />}
                       </div>
                       <AssetPicker inline onSelect={url => setOptions({...options, iconUrl: url, icon: undefined})} />
                    </TabsContent>
                  </Tabs>
               </div>

               <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                 <Label>Ouvrir dans un nouvel onglet</Label>
                 <Switch checked={options.openInNewTab || false} onCheckedChange={(c) => setOptions({ ...options, openInNewTab: c })} />
               </div>
            </div>
         );

      case "ping":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Hôte (IP ou Domaine)</Label>
                <Input value={options.host || ""} onChange={(e) => setOptions({ ...options, host: e.target.value })} placeholder="192.168.1.1" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input value={options.port || ""} onChange={(e) => setOptions({ ...options, port: e.target.value })} placeholder="80" />
              </div>
            </div>
          </div>
        );

      case "weather":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label>Région</Label>
                  <Select value={selectedRegion} onValueChange={(region) => {
                      setSelectedRegion(region);
                      const cities = getCitiesByRegion(region);
                      setAvailableCities(cities);
                      if (cities.length > 0) setOptions({ ...options, city: cities[0].name });
                    }}>
                    <SelectTrigger><SelectValue placeholder="Région" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label>Ville</Label>
                  <Select value={options.city || ""} onValueChange={(city) => setOptions({ ...options, city })} disabled={!selectedRegion}>
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
        const intTypeMap: Record<string, string> = {
          "media-requests": "overseerr",
          "torrent-overview": "torrent-client",
          "monitoring": "monitoring"
        };
        const requiredType = intTypeMap[widget.type];
        const validInts = availableIntegrations.filter((i) => i.type === requiredType);

        if (validInts.length === 0) {
           return <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">Aucune intégration configurée.</div>;
        }

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intégration source</Label>
              <Select value={options.integrationId || "none"} onValueChange={(v) => setOptions({ ...options, integrationId: v === 'none' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un service" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {validInts.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

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
                    <Input type="number" min="1" max="50" value={options.limit || 10} onChange={(e) => setOptions({...options, limit: e.target.value})} />
                 </div>
               </>
            )}

             {widget.type === "torrent-overview" && (
               <>
                <div className="space-y-2">
                    <Label>Limite d'affichage</Label>
                    <Input type="number" min="1" max="20" value={options.limit || 5} onChange={(e) => setOptions({...options, limit: e.target.value})} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <Switch checked={options.showCompleted || false} onCheckedChange={(c) => setOptions({...options, showCompleted: c})} />
                    <Label>Afficher terminés</Label>
                </div>
               </>
            )}
          </div>
        );

      case "iframe":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL de l'iframe</Label>
              <Input value={options.url || ""} onChange={(e) => setOptions({ ...options, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <Label>Fond transparent</Label>
              <Switch checked={options.transparent || false} onCheckedChange={(checked) => setOptions({ ...options, transparent: checked })} />
            </div>
          </div>
        );
      
      case "notes":
         return (
            <div className="space-y-2">
               <Label>Contenu</Label>
               <textarea 
                  className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={options.content || ""}
                  onChange={(e) => setOptions({...options, content: e.target.value})}
               />
            </div>
         );

      default:
        return <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded text-sm">Ce widget n'a pas d'options avancées.</div>;
    }
  };

  if (!widget) return null;

  // Icône dynamique
  const WidgetIcon = {
      link: Globe,
      ping: Server,
      weather: Cloud,
      "media-requests": Film,
      "torrent-overview": Download,
      notes: StickyNote,
      datetime: Clock
  }[widget.type] || Globe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
             <WidgetIcon className="h-5 w-5 text-primary" />
             Modifier : {title}
          </DialogTitle>
          <DialogDescription>
             Type: <span className="font-mono bg-muted px-1 rounded text-foreground text-xs uppercase">{widget.type}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid gap-6">
            {/* Section Générale */}
            <div className="grid gap-4 p-4 border rounded-lg bg-card/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Général</h3>
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                  <SelectTrigger id="category"><SelectValue placeholder="Grille Principale" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🏠 Grille principale</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section Spécifique */}
            <div className="grid gap-4">
               <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Configuration</h3>
               <div className="border rounded-lg p-4 bg-card/50">
                 {renderSpecificFields()}
               </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-muted/10 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}