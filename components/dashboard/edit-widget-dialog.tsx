"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWidget } from "@/lib/actions/widgets";
import { Widget, Category } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";
import { getIntegrations } from "@/lib/actions/integrations";
import { REGIONS, getCitiesByRegion, getCityByName } from "@/lib/cities";
import EmojiPicker from "@/components/ui/emoji-picker";
import AssetPicker from "@/components/ui/asset-picker";

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
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const [options, setOptions] = useState<any>({});
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [availableCities, setAvailableCities] = useState<any[]>([]);

  useEffect(() => {
    if (widget) {
      setTitle(widget.options?.title || "");
      setCategoryId(widget.categoryId || null);
      setInitialCategoryId(widget.categoryId || null);
      setOptions(widget.options || {});
      
      // Pour le widget météo, détecter la région de la ville actuelle
      if (widget.type === "weather" && (widget.options as any)?.city) {
        const cityData = getCityByName((widget.options as any).city);
        if (cityData) {
          setSelectedRegion(cityData.region);
          setAvailableCities(getCitiesByRegion(cityData.region));
        }
      }

      // Pour le widget ping, si la config ancienne utilisait `targetUrl`, essayer d'en extraire host/port
      if (widget.type === "ping") {
        const opts = (widget.options || {}) as any;
        if (!opts.host && opts.targetUrl) {
          try {
            const parsed = new URL(opts.targetUrl);
            const host = parsed.hostname;
            const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
            setOptions({ ...opts, host, port });
          } catch (e) {
            // si targetUrl n'est pas une URL complète, essayer de parser via regex
            const m = String(opts.targetUrl).match(/^(?:https?:\/\/)?([^:\/\s]+)(?::(\d+))?/i);
            if (m) {
              const host = m[1];
              const port = m[2] || "";
              setOptions({ ...opts, host, port });
            }
          }
        }
      }
    }
  }, [widget]);

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const data = await getIntegrations();
        setAvailableIntegrations(data || []);
      } catch (e) {
        // ignore
      }
    };
    loadIntegrations();
  }, []);

  const getWidgetCount = (catId: string) => {
    return widgets.filter((w) => w.categoryId === catId).length;
  };


  const handleSubmit = async () => {
    if (!widget) return;

    setLoading(true);
    try {
      await updateWidget(widget.id, {
        options: { ...options, title },
        categoryId: categoryId,
      });
      onWidgetUpdated?.(widget.id, categoryId, initialCategoryId, { ...options, title });
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour du widget");
    } finally {
      setLoading(false);
    }
  };

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le Widget</DialogTitle>
          <DialogDescription>
            Type: <span className="font-semibold">{widget.type}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Layout Section */}
          <div className="space-y-3 pb-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span>🎯</span>
              Placement
            </h3>
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du widget"
                className="h-9"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs">Catégorie</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                <SelectTrigger id="category" className="h-9">
                  <SelectValue placeholder="Aucune catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <span>🏠</span>
                      <span>Grille principale</span>
                    </span>
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon || '📁'}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryId && categoryId !== initialCategoryId && (
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span>✨</span>
                    <span className="font-medium">Sera déplacé dans cette catégorie</span>
                  </p>
                </div>
              )}
              {!categoryId && initialCategoryId && (
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span>🔄</span>
                    <span className="font-medium">Sera déplacé vers la grille principale</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Widget-specific options */}
          {widget.type === "link" && (
            <div className="space-y-3 pb-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🔗</span>
                Configuration
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="url" className="text-xs">URL</Label>
                <Input
                  id="url"
                  value={options.url || ""}
                  onChange={(e) => setOptions({ ...options, url: e.target.value })}
                  placeholder="https://example.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon" className="text-xs">Icône (emoji)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="icon"
                    value={options.icon || ""}
                    onChange={(e) => setOptions({ ...options, icon: e.target.value })}
                    placeholder="🔗"
                    maxLength={2}
                    className="h-9 w-24"
                  />
                  <div className="flex-1">
                    <EmojiPicker value={options.icon} onSelect={(e) => setOptions({ ...options, icon: e })} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iconUrl" className="text-xs">Icône (URL externe)</Label>
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="iconUrl"
                      value={options.iconUrl || ""}
                      onChange={(e) => setOptions({ ...options, iconUrl: e.target.value })}
                      placeholder="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/png/overseerr.png"
                      className="h-9 flex-1"
                    />
                    {options.iconUrl ? (
                      <div className="h-9 w-9 flex items-center justify-center bg-muted/30 rounded ml-2">
                        <img src={options.iconUrl} alt="preview" className="max-h-6 max-w-full object-contain" />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <AssetPicker inline onSelect={(url) => setOptions({ ...options, iconUrl: url })} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  💡 Parcourez la bibliothèque d'icônes publique <a href="https://github.com/homarr-labs/dashboard-icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">homarr-labs/dashboard-icons</a> ou collez directement une URL d'image.
                </p>
              </div>
            </div>
          )}
          
          {["media-requests", "torrent-overview", "monitoring"].includes(widget.type) && (
            <div className="space-y-3 pb-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🔌</span>
                Intégration
              </h3>
              {availableIntegrations.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune intégration configurée. Allez dans Paramètres &gt; Intégrations.</p>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Service à utiliser</Label>
                  <Select
                    value={options.integrationId || "none"}
                    onValueChange={(v) => setOptions({ ...options, integrationId: v === 'none' ? undefined : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {availableIntegrations
                        .filter((i) => {
                          if (widget.type === 'media-requests') return i.type === 'overseerr';
                          if (widget.type === 'torrent-overview') return i.type === 'torrent-client';
                          if (widget.type === 'monitoring') return i.type === 'monitoring';
                          return false;
                        })
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {widget.type === "ping" && (
            <div className="space-y-3 pb-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🔍</span>
                Configuration
              </h3>
              <div className="space-y-2">
                <Label htmlFor="host" className="text-xs">Hôte</Label>
                <Input
                  id="host"
                  value={options.host || ""}
                  onChange={(e) => setOptions({ ...options, host: e.target.value })}
                  placeholder="example.com or 192.168.1.10"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port" className="text-xs">Port (optionnel)</Label>
                <Input
                  id="port"
                  value={options.port || ""}
                  onChange={(e) => setOptions({ ...options, port: e.target.value })}
                  placeholder="80"
                  className="h-9"
                />
              </div>
            </div>
          )}

          {widget.type === "iframe" && (
            <div className="space-y-3 pb-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🖼️</span>
                Configuration
              </h3>
              <div className="space-y-2">
                <Label htmlFor="iframeUrl" className="text-xs">URL de l'iframe</Label>
                <Input
                  id="iframeUrl"
                  value={options.url || ""}
                  onChange={(e) => setOptions({ ...options, url: e.target.value })}
                  placeholder="https://example.com"
                  className="h-9"
                />
              </div>
            </div>
          )}

          {widget.type === "weather" && (
            <div className="space-y-3 pb-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span>🌤️</span>
                Localisation
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="region" className="text-xs">Région</Label>
                <Select 
                  value={selectedRegion} 
                  onValueChange={(region) => {
                    setSelectedRegion(region);
                    const cities = getCitiesByRegion(region);
                    setAvailableCities(cities);
                    // Sélectionner la première ville de la région
                    if (cities.length > 0) {
                      setOptions({ ...options, city: cities[0].name });
                    }
                  }}
                >
                  <SelectTrigger id="region" className="h-9">
                    <SelectValue placeholder="Sélectionnez une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs">Ville</Label>
                <Select 
                  value={options.city || ""} 
                  onValueChange={(city) => setOptions({ ...options, city })}
                  disabled={!selectedRegion}
                >
                  <SelectTrigger id="city" className="h-9">
                    <SelectValue placeholder={selectedRegion ? "Sélectionnez une ville" : "Sélectionnez d'abord une région"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city.name} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units" className="text-xs">Unités</Label>
                <Select value={options.units || "metric"} onValueChange={(v) => setOptions({ ...options, units: v })}>
                  <SelectTrigger id="units" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Métrique (°C)</SelectItem>
                    <SelectItem value="imperial">Impérial (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
