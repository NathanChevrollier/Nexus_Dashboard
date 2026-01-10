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
import { useAlert } from "@/components/ui/confirm-provider";
import EmojiPicker from "@/components/ui/emoji-picker";
import AssetPicker from "@/components/ui/asset-picker";
import { createWidget } from "@/lib/actions/widgets";
import { getIntegrations } from "@/lib/actions/integrations";
import { REGIONS, getCitiesByRegion } from "@/lib/cities";
import type { Widget } from "@/lib/db/schema";
import { 
  Link as LinkIcon, Activity, Frame, Clock, Cloud, StickyNote, BarChart3, 
  Calendar, CheckSquare, Eye, Timer, Bookmark, Quote, CalendarClock, 
  CalendarRange, Film, ArrowLeft, Check, ListChecks, Download, Server, Loader2
} from "lucide-react";
  import { BookOpen } from "lucide-react";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onWidgetAdded?: (widget: Widget) => void;
}
type WidgetType = "link" | "ping" | "link-ping" | "iframe" | "datetime" | "weather" | "notes" | "chart" | "anime-calendar" | "todo-list" | "watchlist" | "timer" | "bookmarks" | "quote" | "countdown" | "universal-calendar" | "movies-tv-calendar" | "media-requests" | "torrent-overview" | "monitoring" | "media-library" | "library";

const widgetDefinitions = [
  { type: "link", icon: LinkIcon, name: "Lien", description: "Raccourci vers un site", color: "from-blue-500 to-blue-600" },
  { type: "ping", icon: Activity, name: "Ping", description: "Disponibilité serveur", color: "from-green-500 to-emerald-600" },
  { type: "link-ping", icon: Activity, name: "Lien+", description: "Lien cliquable avec surveillance de disponibilité", color: "from-green-500 to-emerald-600" },
  { type: "iframe", icon: Frame, name: "Iframe", description: "Intégration web", color: "from-purple-500 to-purple-600" },
  { type: "datetime", icon: Clock, name: "Horloge", description: "Date et heure", color: "from-orange-500 to-orange-600" },
  { type: "weather", icon: Cloud, name: "Météo", description: "Prévisions locales", color: "from-sky-500 to-sky-600" },
  { type: "notes", icon: StickyNote, name: "Notes", description: "Bloc-notes simple", color: "from-yellow-500 to-amber-600" },
  { type: "chart", icon: BarChart3, name: "Graphique", description: "Visualisation données", color: "from-indigo-500 to-indigo-600" },
  { type: "anime-calendar", icon: Calendar, name: "Calendrier Anime", description: "Sorties AniList", color: "from-pink-500 to-rose-600" },
  { type: "todo-list", icon: CheckSquare, name: "Todo List", description: "Gestion de tâches", color: "from-teal-500 to-cyan-600" },
  { type: "watchlist", icon: Eye, name: "Watchlist", description: "Liste visionnage", color: "from-red-500 to-red-600" },
  { type: "timer", icon: Timer, name: "Timer", description: "Pomodoro / Chrono", color: "from-violet-500 to-purple-600" },
  { type: "bookmarks", icon: Bookmark, name: "Favoris", description: "Collection de liens", color: "from-fuchsia-500 to-pink-600" },
  { type: "quote", icon: Quote, name: "Citation", description: "Citation du jour", color: "from-slate-500 to-gray-600" },
  { type: "countdown", icon: CalendarClock, name: "Compte à rebours", description: "Jours restants", color: "from-lime-500 to-green-600" },
  { type: "universal-calendar", icon: CalendarRange, name: "Calendrier Global", description: "Tous événements", color: "from-cyan-500 to-blue-600" },
  { type: "movies-tv-calendar", icon: Film, name: "Cinéma & TV", description: "Sorties TMDb", color: "from-rose-500 to-red-600" },
  { type: "media-requests", icon: ListChecks, name: "Media Requests", description: "Overseerr / Jellyseerr", color: "from-emerald-500 to-teal-600" },
  { type: "media-library", icon: Film, name: "Médiathèque", description: "Accès bibliothèque", color: "from-fuchsia-500 to-indigo-500" },
  { type: "library", icon: BookOpen, name: "Library", description: "Gérer ta collection", color: "from-fuchsia-500 to-pink-500" },
  { type: "torrent-overview", icon: Download, name: "Torrent Overview", description: "Client Torrent", color: "from-blue-500 to-cyan-500" },
  { type: "monitoring", icon: Server, name: "Monitoring", description: "Ressources Serveur", color: "from-amber-500 to-orange-500" },
];

// Data
export default function AddWidgetDialog({ open, onOpenChange, dashboardId, onWidgetAdded }: AddWidgetDialogProps) {
  const alert = useAlert();

  // Local UI state
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedWidget, setSelectedWidget] = useState<WidgetType | null>(null);
  const [loading, setLoading] = useState(false);

  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [availableCities, setAvailableCities] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // Form State (Single object for simplicity, cleared on open)
  const [formState, setFormState] = useState<any>({});

  const loadIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const data = await getIntegrations();
      setAvailableIntegrations(data || []);
    } catch (error) {
      console.error("Erreur intégrations", error);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedWidget(null);
      setFormState({}); // Reset form
      loadIntegrations();
    }
  }, [open]);

  const handleWidgetSelect = (type: WidgetType) => {
    setSelectedWidget(type);
    
    // Initialize default values based on type
    const defaults: any = { title: "" };
    
    // Default Titles
    const def = widgetDefinitions.find(w => w.type === type);
    if (def) defaults.title = def.name;

    switch (type) {
      case "link": Object.assign(defaults, { icon: "🔗", openInNewTab: true, title: "Nouveau lien" }); break;
      case "link-ping": Object.assign(defaults, { openInNewTab: true, title: "Service" }); break;
      case "ping": Object.assign(defaults, { port: "80", title: "Serveur" }); break;
      case "weather": Object.assign(defaults, { units: "metric", title: "Météo" }); break;
      case "media-requests": Object.assign(defaults, { limit: 10, statusFilter: "all", title: "Requêtes" }); break;
      case "torrent-overview": Object.assign(defaults, { limit: 5, showCompleted: false, title: "Torrents" }); break;
      case "iframe": Object.assign(defaults, { transparent: false, title: "Embed" }); break;
      case "notes": Object.assign(defaults, { content: "", title: "Notes" }); break;
      case "timer": Object.assign(defaults, { pomodoroMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, customMinutes: 30, title: "Timer" }); break;
      case "countdown": Object.assign(defaults, { countdownDate: new Date(Date.now() + 86400000).toISOString(), countdownEmoji: "🎉", title: "Événement" }); break;
      case "chart": Object.assign(defaults, { chartType: "bar", title: "Graphique" }); break;
      case "library": Object.assign(defaults, { title: "Bibliothèque", variant: 'detailed' }); break;
    }
    setFormState(defaults);
    setStep("configure");
  };

  const handleSubmit = async () => {
    if (!selectedWidget) return;
    setLoading(true);

    try {
      // Prepare options with correct types
      const options = { ...formState };
      if (options.limit) options.limit = Number(options.limit);
      if (options.port) options.port = options.port; 

      // Default dimensions mapping
      const sizeMap: Partial<Record<WidgetType, { w: number, h: number }>> = {
         "link": { w: 2, h: 2 },
         "link-ping": { w: 3, h: 2 },
         "ping": { w: 3, h: 2 },
         "weather": { w: 2, h: 2 },
         "datetime": { w: 4, h: 2 },
         "iframe": { w: 4, h: 3 },
         "notes": { w: 4, h: 4 },
         "todo-list": { w: 3, h: 4 },
         "media-requests": { w: 4, h: 4 },
         "torrent-overview": { w: 4, h: 4 },
         "media-library": { w: 4, h: 3 },
         "library": { w: 4, h: 3 },
         "monitoring": { w: 4, h: 3 },
         "chart": { w: 5, h: 3 },
         "anime-calendar": { w: 4, h: 4 },
         "universal-calendar": { w: 5, h: 5 },
         "movies-tv-calendar": { w: 4, h: 4 },
         "countdown": { w: 3, h: 3 },
         "timer": { w: 3, h: 4 },
         "watchlist": { w: 4, h: 4 },
         "bookmarks": { w: 4, h: 4 },
         "quote": { w: 4, h: 3 },
      };

      const size = sizeMap[selectedWidget] || { w: 2, h: 2 };

      const newWidget = await createWidget(dashboardId, {
        type: selectedWidget,
        x: 0, y: 0,
        ...size,
        options,
      });

      if (newWidget && onWidgetAdded) {
        onWidgetAdded({ ...newWidget, categoryId: null } as any);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Création widget échouée:", error);
      await alert("Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  // --- Configuration renderers ---
  const renderConfig = () => {
    switch (selectedWidget) {
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
              <Tabs defaultValue="emoji" className="w-full">
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
               <Tabs defaultValue="emoji" className="w-full">
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
                 <Select onValueChange={(r) => {
                    setSelectedRegion(r);
                    const cities = getCitiesByRegion(r);
                    setAvailableCities(cities);
                    if(cities.length > 0) setFormState({...formState, city: cities[0].name});
                 }}>
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
         const reqType = typeMap[selectedWidget];
         const validIntegrations = availableIntegrations.filter(i => i.type === reqType);

         if (validIntegrations.length === 0) {
            return (
              <div className="p-6 text-center border-2 border-dashed rounded-xl bg-muted/10">
                 <p className="text-muted-foreground mb-4">Aucune intégration compatible trouvée.</p>
                 <Button variant="outline" asChild><a href="/settings" target="_blank">Ajouter une intégration</a></Button>
              </div>
            );
         }
        case "library":
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Affichage</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={formState.variant === 'simple' ? 'secondary' : 'ghost'} onClick={() => setFormState({...formState, variant: 'simple'})}>Simple</Button>
                  <Button size="sm" variant={formState.variant === 'detailed' ? 'secondary' : 'ghost'} onClick={() => setFormState({...formState, variant: 'detailed'})}>Détaillé</Button>
                </div>
                <p className="text-sm text-muted-foreground">Simple = apparence compacte (type Lien+ sans ping). Détaillé = carte complète avec progression.</p>
              </div>
            </div>
          );

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
             
             {selectedWidget === "media-requests" && (
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

             {selectedWidget === "torrent-overview" && (
                <div className="space-y-2">
                  <Label>Limite torrents</Label>
                  <Input type="number" value={formState.limit} onChange={e => setFormState({...formState, limit: e.target.value})} min={1} max={20} />
                </div>
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
                    onChange={e => setFormState({...formState, content: e.target.value})} 
                    placeholder="Écrivez quelque chose..."
                 />
              </div>
           </div>
        );

      case "countdown":
        return (
          <div className="space-y-4">
             <div className="space-y-2">
               <Label>Titre de l'événement</Label>
               <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Date cible</Label>
               <Input 
                 type="datetime-local" 
                 value={formState.countdownDate ? new Date(formState.countdownDate).toISOString().slice(0, 16) : ""} 
                 onChange={e => setFormState({...formState, countdownDate: new Date(e.target.value).toISOString()})} 
               />
             </div>
             <div className="space-y-2">
                <Label>Emoji</Label>
                <div className="flex gap-2">
                   <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded border">{formState.countdownEmoji || "📅"}</div>
                   <div className="flex-1">
                      <EmojiPicker value={formState.countdownEmoji} onSelect={e => setFormState({...formState, countdownEmoji: e})} />
                   </div>
                </div>
             </div>
          </div>
        );

      case "timer":
        return (
           <div className="space-y-4">
              <div className="space-y-2">
                 <Label>Titre</Label>
                 <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <Label className="text-xs">Pomodoro (min)</Label>
                    <Input type="number" value={formState.pomodoroMinutes} onChange={e => setFormState({...formState, pomodoroMinutes: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Pause (min)</Label>
                    <Input type="number" value={formState.shortBreakMinutes} onChange={e => setFormState({...formState, shortBreakMinutes: Number(e.target.value)})} />
                 </div>
              </div>
           </div>
        );

      case "chart":
        return (
          <div className="space-y-4">
             <div className="space-y-2">
               <Label>Titre</Label>
               <Input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} />
             </div>
             <div className="bg-muted/50 p-3 rounded text-sm text-muted-foreground">
                Vous pourrez configurer les données du graphique après l'avoir créé.
             </div>
          </div>
        );

      default:
        // Default simple form for widgets with just a Title (Todo, Watchlist, Calendar, etc.)
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={formState.title || ""} onChange={e => setFormState({...formState, title: e.target.value})} />
            </div>
            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border">
              Ce widget sera configuré avec des valeurs par défaut. Vous pourrez le personnaliser davantage après sa création.
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === "configure" && (
               <Button variant="ghost" size="icon" onClick={() => setStep("select")} className="-ml-2 h-8 w-8">
                 <ArrowLeft className="h-4 w-4" />
               </Button>
            )}
            {step === "select" ? "Ajouter un Widget" : `Configurer : ${widgetDefinitions.find(w => w.type === selectedWidget)?.name}`}
          </DialogTitle>
          <DialogDescription>
             {step === "select" ? "Choisissez un module à ajouter à votre tableau de bord." : "Personnalisez les options avant l'ajout."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-background/50">
          {step === "select" ? (
            <ScrollArea className="h-[60vh]">
                 {loadingIntegrations ? (
                   <div className="h-[60vh] flex items-center justify-center">
                     <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                   </div>
                 ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                   {widgetDefinitions.map((w) => {
                    const Icon = w.icon;
                    // Check integration requirement
                    const reqInt = ["media-requests", "torrent-overview", "monitoring"].includes(w.type);
                    const hasInt = !reqInt || availableIntegrations.some(i => 
                        (w.type === "media-requests" && i.type === "overseerr") ||
                        (w.type === "torrent-overview" && i.type === "torrent-client") ||
                        (w.type === "monitoring" && i.type === "monitoring")
                    );

                    return (
                      <button
                        key={w.type}
                        onClick={() => handleWidgetSelect(w.type as any)}
                        disabled={!hasInt && reqInt}
                        className={`group relative flex flex-col items-center p-4 rounded-xl border text-center gap-3 transition-all duration-200
                           ${!hasInt && reqInt 
                              ? "opacity-60 cursor-not-allowed bg-muted/20 border-transparent grayscale" 
                              : "bg-card border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"}
                        `}
                      >
                         <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${w.color} flex items-center justify-center shadow-md transition-transform group-hover:scale-110`}>
                            <Icon className="text-white h-6 w-6" />
                         </div>
                         <div className="space-y-1">
                            <span className="font-semibold text-sm block">{w.name}</span>
                            <span className="text-xs text-muted-foreground line-clamp-2 leading-tight px-1">{w.description}</span>
                         </div>
                         
                         {!hasInt && reqInt && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
                               <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20 shadow-sm">
                                 Intégration requise
                               </span>
                            </div>
                         )}
                      </button>
                    );
                 })}
                </div>
                )}
             </ScrollArea>
          ) : (
             <ScrollArea className="h-[60vh]">
               <div className="max-w-lg mx-auto p-6">
                  <div className="border rounded-xl p-6 bg-card shadow-sm">
                     {renderConfig()}
                  </div>
               </div>
             </ScrollArea>
          )}
        </div>

        {step === "configure" && (
           <DialogFooter className="p-4 bg-muted/10 border-t">
              <Button variant="ghost" onClick={() => setStep("select")} disabled={loading}>Retour</Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                 {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                 Ajouter le widget
              </Button>
           </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Backwards-compatible named export expected by other modules
export const AddWidgetDialogModern = AddWidgetDialog;