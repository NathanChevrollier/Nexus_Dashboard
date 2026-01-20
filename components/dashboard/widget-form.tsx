"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmojiPicker from "@/components/ui/emoji-picker";
import AssetPicker from "@/components/ui/asset-picker";
import { REGIONS, getCitiesByRegion } from "@/lib/cities";
import { Button } from "@/components/ui/button";

interface WidgetFormProps {
  widgetType: string | null;
  formState: any;
  setFormState: (next: any) => void;
  availableIntegrations?: any[];
  availableCities?: any[];
  selectedRegion?: string;
  setSelectedRegion?: (r: string) => void;
}

export default function WidgetForm({ widgetType, formState, setFormState, availableIntegrations = [], availableCities = [], selectedRegion = "", setSelectedRegion }: WidgetFormProps) {
  if (!widgetType) return null;

  const common = {
    formState,
    setFormState,
  } as const;

  switch (widgetType) {
    case "link":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={formState.url || ""} onChange={e => setFormState({...formState, url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Icône</Label>
            <Tabs defaultValue={formState.iconUrl ? "custom" : "emoji"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="custom">Image</TabsTrigger>
              </TabsList>
              <TabsContent value="emoji" className="pt-2 flex gap-3">
                 <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">{formState.icon}</div>
                 <div className="flex-1"><EmojiPicker value={formState.icon} onSelect={e => setFormState({...formState, icon: e, iconUrl: undefined})} /></div>
              </TabsContent>
              <TabsContent value="custom" className="pt-2 space-y-2">
                 <div className="flex gap-2">
                    <Input placeholder="https://..." value={formState.iconUrl || ""} onChange={e => setFormState({...formState, iconUrl: e.target.value, icon: undefined})} />
                    {formState.iconUrl && <img src={formState.iconUrl} className="h-10 w-10 object-contain bg-white rounded border" />}
                 </div>
                 <AssetPicker inline onSelect={url => setFormState({...formState, iconUrl: url, icon: undefined})} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
            <Label htmlFor="newtab">Nouvel onglet</Label>
            <Switch id="newtab" checked={formState.openInNewTab} onCheckedChange={c => setFormState({...formState, openInNewTab: c})} />
          </div>
        </div>
      );

    case "link-ping":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>URL (avec port si nécessaire)</Label>
            <Input value={formState.url || ""} onChange={e => setFormState({...formState, url: e.target.value})} placeholder="https://mon-service:8080" />
          </div>
          <div className="space-y-2">
            <Label>Icône</Label>
            <Tabs defaultValue={formState.iconUrl ? "custom" : "emoji"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="custom">Image</TabsTrigger>
              </TabsList>
              <TabsContent value="emoji" className="pt-2 flex gap-3">
                 <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">{formState.icon}</div>
                 <div className="flex-1"><EmojiPicker value={formState.icon} onSelect={e => setFormState({...formState, icon: e, iconUrl: undefined})} /></div>
              </TabsContent>
              <TabsContent value="custom" className="pt-2 space-y-2">
                 <div className="flex gap-2">
                    <Input placeholder="https://..." value={formState.iconUrl || ""} onChange={e => setFormState({...formState, iconUrl: e.target.value, icon: undefined})} />
                    {formState.iconUrl && <img src={formState.iconUrl} className="h-10 w-10 object-contain bg-white rounded border" />}
                 </div>
                 <AssetPicker inline onSelect={url => setFormState({...formState, iconUrl: url, icon: undefined})} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
            <Label htmlFor="newtab-lp">Nouvel onglet</Label>
            <Switch id="newtab-lp" checked={formState.openInNewTab} onCheckedChange={c => setFormState({...formState, openInNewTab: c})} />
          </div>
        </div>
      );

    case "ping":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
             <Label>Titre</Label>
             <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-2 space-y-2">
               <Label>Hôte</Label>
               <Input value={formState.host || ""} onChange={e => setFormState({...formState, host: e.target.value})} placeholder="192.168.1.1" />
             </div>
             <div className="space-y-2">
               <Label>Port</Label>
               <Input value={formState.port || ""} onChange={e => setFormState({...formState, port: e.target.value})} placeholder="80" />
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
               <Select value={selectedRegion} onValueChange={(r) => { setSelectedRegion?.(r); const cities = getCitiesByRegion(r); if (cities.length > 0) setFormState({...formState, city: cities[0].name}); }}>
                 <SelectTrigger><SelectValue placeholder="Région" /></SelectTrigger>
                 <SelectContent>
                   {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Ville</Label>
               <Select value={formState.city || ""} onValueChange={c => setFormState({...formState, city: c})} disabled={!selectedRegion}>
                 <SelectTrigger><SelectValue placeholder="Ville" /></SelectTrigger>
                 <SelectContent>
                   {availableCities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <div className="space-y-2">
             <Label>Unités</Label>
             <Select value={formState.units || "metric"} onValueChange={v => setFormState({...formState, units: v})}>
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
      const typeMap: any = { "media-requests": "overseerr", "torrent-overview": "torrent-client", "monitoring": "monitoring" };
      const reqType = typeMap[widgetType];
      const validIntegrations = availableIntegrations.filter(i => i.type === reqType);

      if (validIntegrations.length === 0) {
        return (
          <div className="p-6 text-center border-2 border-dashed rounded-xl bg-muted/10">
             <p className="text-muted-foreground mb-4">Aucune intégration compatible trouvée.</p>
             <Button variant="outline" asChild><a href="/settings" target="_blank">Ajouter une intégration</a></Button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Intégration</Label>
            <Select value={formState.integrationId || ""} onValueChange={v => setFormState({...formState, integrationId: v})}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {validIntegrations.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {widgetType === "media-requests" && (
             <>
               <div className="space-y-2">
                  <Label>Filtre Statut</Label>
                  <Select value={formState.statusFilter} onValueChange={v => setFormState({...formState, statusFilter: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                 <Label>Limite</Label>
                 <Input type="number" value={formState.limit} onChange={e => setFormState({...formState, limit: e.target.value})} min={1} max={50} />
               </div>
             </>
          )}

          {widgetType === "torrent-overview" && (
             <>
               <div className="space-y-2">
                 <Label>Limite torrents actifs</Label>
                 <Input 
                   type="number" 
                   value={formState.limitActive || 10} 
                   onChange={e => setFormState({...formState, limitActive: parseInt(e.target.value) || 10})} 
                   min={1} 
                   max={50} 
                 />
               </div>
               <div className="space-y-2">
                 <Label>Intervalle de rafraîchissement (secondes)</Label>
                 <Input 
                   type="number" 
                   value={formState.refreshInterval || 5} 
                   onChange={e => setFormState({...formState, refreshInterval: parseInt(e.target.value) || 5})} 
                   min={3} 
                   max={60} 
                 />
               </div>
             </>
          )}
        </div>
      );

    case "iframe":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL Iframe</Label>
            <Input value={formState.url || ""} onChange={e => setFormState({...formState, url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
             <Label>Fond transparent</Label>
             <Switch checked={formState.transparent} onCheckedChange={c => setFormState({...formState, transparent: c})} />
          </div>
        </div>
      );

    case "notes":
      return (
        <div className="space-y-4">
           <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
           </div>
           <div className="space-y-2">
              <Label>Contenu initial</Label>
              <textarea 
                 className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm" 
                 value={formState.content || ""}
                 onChange={(e) => setFormState({...formState, content: e.target.value})}
              />
           </div>
        </div>
      );

    default:
      return <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded">Ce widget n'a pas d'options avancées.</div>;
  }
}
