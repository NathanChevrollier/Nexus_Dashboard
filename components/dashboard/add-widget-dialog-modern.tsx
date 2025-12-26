"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EmojiPicker from "@/components/ui/emoji-picker";
import AssetPicker from "@/components/ui/asset-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createWidget } from "@/lib/actions/widgets";
import { 
  Link as LinkIcon, 
  Activity, 
  Frame, 
  Clock, 
  Cloud, 
  StickyNote, 
  BarChart3, 
  Calendar, 
  CheckSquare, 
  Eye, 
  Timer, 
  Bookmark, 
  Quote, 
  CalendarClock, 
  Film, 
  CalendarRange,
  ArrowLeft,
  Check,
  ListChecks,
  Download,
  Server,
} from "lucide-react";
import { getIntegrations } from "@/lib/actions/integrations";
import type { Widget } from "@/lib/db/schema";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onWidgetAdded?: (widget: Widget) => void;
}

type WidgetType =
  | "link"
  | "ping"
  | "iframe"
  | "datetime"
  | "weather"
  | "notes"
  | "chart"
  | "anime-calendar"
  | "todo-list"
  | "watchlist"
  | "timer"
  | "bookmarks"
  | "quote"
  | "countdown"
  | "universal-calendar"
  | "movies-tv-calendar"
  | "media-requests"
  | "torrent-overview"
  | "monitoring"
  | "media-library";

const widgetDefinitions = [
  {
    type: "link" as WidgetType,
    icon: LinkIcon,
    name: "Lien",
    description: "Lien rapide vers un site",
    color: "from-blue-500 to-blue-600",
  },
  {
    type: "ping" as WidgetType,
    icon: Activity,
    name: "Ping",
    description: "Surveiller un serveur",
    color: "from-green-500 to-emerald-600",
  },
  {
    type: "iframe" as WidgetType,
    icon: Frame,
    name: "Iframe",
    description: "Intégrer une page web",
    color: "from-purple-500 to-purple-600",
  },
  {
    type: "datetime" as WidgetType,
    icon: Clock,
    name: "Horloge",
    description: "Date et heure",
    color: "from-orange-500 to-orange-600",
  },
  {
    type: "weather" as WidgetType,
    icon: Cloud,
    name: "Météo",
    description: "Prévisions météo",
    color: "from-sky-500 to-sky-600",
  },
  {
    type: "notes" as WidgetType,
    icon: StickyNote,
    name: "Notes",
    description: "Prendre des notes",
    color: "from-yellow-500 to-amber-600",
  },
  {
    type: "chart" as WidgetType,
    icon: BarChart3,
    name: "Graphique",
    description: "Visualiser des données",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    type: "anime-calendar" as WidgetType,
    icon: Calendar,
    name: "Calendrier Animé",
    description: "Anime & Manga à venir",
    color: "from-pink-500 to-rose-600",
  },
  {
    type: "todo-list" as WidgetType,
    icon: CheckSquare,
    name: "Todo List",
    description: "Gérer vos tâches",
    color: "from-teal-500 to-cyan-600",
  },
  {
    type: "watchlist" as WidgetType,
    icon: Eye,
    name: "Watchlist",
    description: "Liste de visionnage",
    color: "from-red-500 to-red-600",
  },
  {
    type: "timer" as WidgetType,
    icon: Timer,
    name: "Timer",
    description: "Minuteur et chronomètre",
    color: "from-violet-500 to-purple-600",
  },
  {
    type: "bookmarks" as WidgetType,
    icon: Bookmark,
    name: "Favoris",
    description: "Vos liens favoris",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    type: "quote" as WidgetType,
    icon: Quote,
    name: "Citation",
    description: "Citation du jour",
    color: "from-slate-500 to-gray-600",
  },
  {
    type: "countdown" as WidgetType,
    icon: CalendarClock,
    name: "Compte à rebours",
    description: "Compteur d'événement",
    color: "from-lime-500 to-green-600",
  },
  {
    type: "universal-calendar" as WidgetType,
    icon: CalendarRange,
    name: "Calendrier Universel",
    description: "Tous vos événements",
    color: "from-cyan-500 to-blue-600",
  },
  {
    type: "movies-tv-calendar" as WidgetType,
    icon: Film,
    name: "Films & Séries",
    description: "Sorties cinéma et TV",
    color: "from-rose-500 to-red-600",
  },
  {
    type: "media-requests" as WidgetType,
    icon: ListChecks,
    name: "Media Requests",
    description: "Liste des demandes (Overseerr)",
    color: "from-emerald-500 to-teal-600",
  },
  {
    type: "media-library" as WidgetType,
    icon: Film,
    name: "Médiathèque",
    description: "Page complète films/séries/musiques",
    color: "from-fuchsia-500 to-indigo-500",
  },
  {
    type: "torrent-overview" as WidgetType,
    icon: Download,
    name: "Torrent Overview",
    description: "Vitesse & torrents en cours",
    color: "from-blue-500 to-cyan-500",
  },
  {
    type: "monitoring" as WidgetType,
    icon: Server,
    name: "Monitoring Serveur",
    description: "CPU, RAM, load & uptime",
    color: "from-amber-500 to-orange-500",
  },
];

export function AddWidgetDialogModern({ open, onOpenChange, dashboardId, onWidgetAdded }: AddWidgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedWidget, setSelectedWidget] = useState<WidgetType | null>(null);
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  // Formulaires pour chaque type
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "🔗", iconUrl: "", openInNewTab: true });
  const [pingForm, setPingForm] = useState({ title: "", host: "", port: 80 });
  const [iframeForm, setIframeForm] = useState({ title: "", iframeUrl: "" });
  const [weatherForm, setWeatherForm] = useState({ city: "Paris" });
  const [notesForm, setNotesForm] = useState({ title: "Notes", content: "" });
  const [chartForm, setChartForm] = useState({ title: "Statistiques", chartType: "bar" });
  const [animeForm, setAnimeForm] = useState({ defaultTab: "anime", daysToShow: 7 });
  const [todoForm, setTodoForm] = useState({ title: "Todo List", todos: [] });
  const [watchlistForm, setWatchlistForm] = useState({ title: "Watchlist", watchlist: [] });
  const [timerForm, setTimerForm] = useState({ 
    title: "Timer",
    pomodoroMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    customMinutes: 30,
  });
  const [bookmarksForm, setBookmarksForm] = useState({ title: "Bookmarks", bookmarks: [] });
  const [quoteForm, setQuoteForm] = useState({ title: "Quote of the Day" });
  const [countdownForm, setCountdownForm] = useState({ 
    countdownTitle: "Mon Événement", 
    countdownDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
    countdownEmoji: "🎉" 
  });
  const [universalCalendarForm, setUniversalCalendarForm] = useState({ 
    calendarView: "month",
    enabledSources: { anime: true, manga: true, movies: true, tv: true, personal: true },
    sourceColors: {
      anime: "#3b82f6",
      manga: "#8b5cf6",
      movies: "#ef4444",
      tv: "#10b981",
      personal: "#f59e0b",
    },
    showWeekends: true,
  });
  const [moviesTVForm, setMoviesTVForm] = useState({ 
    view: "both",
    timeWindow: "day",
    showTrending: true,
  });
  const [mediaRequestsForm, setMediaRequestsForm] = useState({
    title: "Media Requests",
    integrationId: "",
    statusFilter: "all" as "all" | "pending" | "approved" | "declined",
    limit: 10,
  });
  const [torrentForm, setTorrentForm] = useState({
    title: "Torrent Overview",
    integrationId: "",
    limitActive: 10,
    showCompleted: true,
  });
  const [monitoringForm, setMonitoringForm] = useState({
    title: "Monitoring Serveur",
    integrationId: "",
  });
  const [mediaLibraryForm, setMediaLibraryForm] = useState({
    title: "Médiathèque",
  });

  const loadIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const data = await getIntegrations();
      setAvailableIntegrations(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des intégrations", error);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleWidgetSelect = (type: WidgetType) => {
    setSelectedWidget(type);
    setStep("configure");

    if (type === "media-requests" || type === "torrent-overview" || type === "monitoring") {
      loadIntegrations();
    }
  };

  useEffect(() => {
    // Preload integrations when dialog opens
    if (open && availableIntegrations.length === 0) {
      loadIntegrations();
    }
  }, [open]);

  const handleBack = () => {
    setStep("select");
    setSelectedWidget(null);
  };

  const handleSubmit = async () => {
    if (!selectedWidget) return;

    setLoading(true);
    try {
      let options: any = {};
      let defaultSize = { w: 2, h: 2 };

      switch (selectedWidget) {
        case "link":
          options = linkForm;
          defaultSize = { w: 2, h: 1 };
          break;
        case "ping":
          options = pingForm;
          defaultSize = { w: 2, h: 1 };
          break;
        case "iframe":
          options = iframeForm;
          defaultSize = { w: 4, h: 3 };
          break;
        case "datetime":
          options = { format: "PPP", timezone: "Europe/Paris" };
          defaultSize = { w: 3, h: 1 };
          break;
        case "weather":
          options = weatherForm;
          defaultSize = { w: 2, h: 2 };
          break;
        case "notes":
          options = notesForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "chart":
          options = chartForm;
          defaultSize = { w: 4, h: 2 };
          break;
        case "anime-calendar":
          options = animeForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "todo-list":
          options = todoForm;
          defaultSize = { w: 2, h: 3 };
          break;
        case "watchlist":
          options = watchlistForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "timer":
          options = timerForm;
          defaultSize = { w: 2, h: 3 };
          break;
        case "bookmarks":
          options = bookmarksForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "quote":
          options = quoteForm;
          defaultSize = { w: 3, h: 2 };
          break;
        case "countdown":
          options = countdownForm;
          defaultSize = { w: 2, h: 2 };
          break;
        case "universal-calendar":
          options = universalCalendarForm;
          defaultSize = { w: 4, h: 4 };
          break;
        case "movies-tv-calendar":
          options = moviesTVForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "media-requests":
          options = mediaRequestsForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "torrent-overview":
          options = torrentForm;
          defaultSize = { w: 3, h: 3 };
          break;
        case "monitoring":
          options = monitoringForm;
          defaultSize = { w: 3, h: 2 };
          break;
        case "media-library":
          options = mediaLibraryForm;
          defaultSize = { w: 3, h: 2 };
          break;
      }

      const newWidget = await createWidget(dashboardId, {
        type: selectedWidget,
        x: 0,
        y: 0,
        ...defaultSize,
        options,
      });

      if (newWidget && onWidgetAdded) {
        onWidgetAdded({
          ...newWidget,
          categoryId: newWidget.categoryId ?? null,
          categoryX: (newWidget as any).categoryX ?? 0,
          categoryY: (newWidget as any).categoryY ?? 0,
        });
      }

      // Reset
      handleBack();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la création du widget:", error);
      alert("Erreur lors de la création du widget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setStep("select");
        setSelectedWidget(null);
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "configure" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "select" ? "Choisir un widget" : `Configurer : ${widgetDefinitions.find(w => w.type === selectedWidget)?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Sélectionnez le type de widget que vous souhaitez ajouter"
              : "Configurez les paramètres de votre widget"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {widgetDefinitions.map((widget) => {
                const Icon = widget.icon;
                // Check if widget requires an integration
                const requiresIntegration = ["media-requests", "torrent-overview", "monitoring"].includes(widget.type);
                const hasRequiredIntegration = requiresIntegration && availableIntegrations.length > 0;
                const isDisabled = requiresIntegration && !hasRequiredIntegration;
                
                return (
                  <div key={widget.type} className="relative group">
                    <button
                      onClick={() => handleWidgetSelect(widget.type)}
                      disabled={isDisabled}
                      className={`w-full group relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                        isDisabled 
                          ? 'border-transparent opacity-50 cursor-not-allowed' 
                          : 'border-transparent hover:border-primary/50 hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${widget.color} opacity-10 ${!isDisabled && 'group-hover:opacity-20'} transition-opacity`} />
                      <div className="relative p-4 flex flex-col items-center text-center space-y-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${widget.color} flex items-center justify-center shadow-md`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm">{widget.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{widget.description}</p>
                        </div>
                      </div>
                    </button>
                    {isDisabled && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                        <div className="text-xs font-medium text-white text-center px-2">
                          Créez une intégration<br />pour utiliser ce widget
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            <div className="space-y-4">
              {selectedWidget === "link" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={linkForm.title}
                      onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                      placeholder="Mon lien"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icône (emoji)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={linkForm.icon}
                        onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                        placeholder="🔗"
                        maxLength={2}
                        className="h-9 w-24"
                      />
                      <div className="flex-1">
                        <EmojiPicker value={linkForm.icon} onSelect={(e) => setLinkForm({ ...linkForm, icon: e })} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Icône (URL externe)</Label>
                    <div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={(linkForm as any).iconUrl || ""}
                          onChange={(e) => setLinkForm({ ...linkForm, iconUrl: e.target.value })}
                          placeholder="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/png/overseerr.png"
                          className="h-9 flex-1"
                        />
                        {(linkForm as any).iconUrl ? (
                          <div className="h-9 w-9 flex items-center justify-center bg-muted/30 rounded ml-2">
                            <img src={(linkForm as any).iconUrl} alt="preview" className="max-h-6 max-w-full object-contain" />
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <AssetPicker inline onSelect={(url) => setLinkForm({ ...linkForm, iconUrl: url })} />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      💡 Parcourez la bibliothèque d'icônes publique <a href="https://github.com/homarr-labs/dashboard-icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">homarr-labs/dashboard-icons</a> ou collez directement une URL d'image.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={linkForm.openInNewTab}
                      onChange={(e) => setLinkForm({ ...linkForm, openInNewTab: e.target.checked })}
                      id="openInNewTab"
                      className="rounded"
                    />
                    <Label htmlFor="openInNewTab">Ouvrir dans un nouvel onglet</Label>
                  </div>
                </>
              )}
              {selectedWidget === "media-library" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={mediaLibraryForm.title}
                      onChange={(e) => setMediaLibraryForm({ ...mediaLibraryForm, title: e.target.value })}
                      placeholder="Médiathèque"
                    />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg mt-2">
                    <p className="text-sm text-muted-foreground">
                      Ce widget agit comme un raccourci vers une page complète où vous pouvez gérer vos films,
                      séries et musiques, et lancer un lecteur vidéo capable de lire des sources 4K.
                    </p>
                  </div>
                </>
              )}
              {selectedWidget === "media-requests" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={mediaRequestsForm.title}
                      onChange={(e) =>
                        setMediaRequestsForm({ ...mediaRequestsForm, title: e.target.value })
                      }
                      placeholder="Media Requests"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intégration Overseerr</Label>
                    {loadingIntegrations ? (
                      <p className="text-xs text-muted-foreground">
                        Chargement des intégrations...
                      </p>
                    ) : availableIntegrations.filter((i) => i.type === "overseerr").length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucune intégration Overseerr trouvée. Rendez-vous dans les Paramètres &gt; Intégrations
                        pour en ajouter une, puis revenez ici.
                      </p>
                    ) : (
                      <select
                        value={mediaRequestsForm.integrationId}
                        onChange={(e) =>
                          setMediaRequestsForm({
                            ...mediaRequestsForm,
                            integrationId: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="">Sélectionner une intégration</option>
                        {availableIntegrations
                          .filter((i) => i.type === "overseerr")
                          .map((integration) => (
                            <option key={integration.id} value={integration.id}>
                              {integration.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Filtre de statut</Label>
                    <select
                      value={mediaRequestsForm.statusFilter}
                      onChange={(e) =>
                        setMediaRequestsForm({
                          ...mediaRequestsForm,
                          statusFilter: e.target.value as any,
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      <option value="all">Toutes les demandes</option>
                      <option value="pending">En attente</option>
                      <option value="approved">Approuvées</option>
                      <option value="declined">Refusées</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre maximum de demandes</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={mediaRequestsForm.limit}
                      onChange={(e) =>
                        setMediaRequestsForm({
                          ...mediaRequestsForm,
                          limit: Number(e.target.value) || 10,
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ce widget affiche les dernières demandes de médias depuis votre instance Overseerr / Jellyseerr
                    en utilisant l'intégration configurée.
                  </p>
                </>
              )}

              {selectedWidget === "torrent-overview" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={torrentForm.title}
                      onChange={(e) =>
                        setTorrentForm({
                          ...torrentForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="Torrent Overview"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intégration Torrent</Label>
                    {loadingIntegrations ? (
                      <p className="text-xs text-muted-foreground">
                        Chargement des intégrations...
                      </p>
                    ) : availableIntegrations.filter((i) => i.type === "torrent-client").length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucune intégration de client torrent trouvée. Rendez-vous dans les Paramètres &gt; Intégrations
                        pour en ajouter une, puis revenez ici.
                      </p>
                    ) : (
                      <select
                        value={torrentForm.integrationId}
                        onChange={(e) =>
                          setTorrentForm({
                            ...torrentForm,
                            integrationId: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="">Sélectionner une intégration</option>
                        {availableIntegrations
                          .filter((i) => i.type === "torrent-client")
                          .map((integration) => (
                            <option key={integration.id} value={integration.id}>
                              {integration.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre maximum de torrents actifs</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={torrentForm.limitActive}
                      onChange={(e) =>
                        setTorrentForm({
                          ...torrentForm,
                          limitActive: Number(e.target.value) || 10,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={torrentForm.showCompleted}
                      onChange={(e) =>
                        setTorrentForm({
                          ...torrentForm,
                          showCompleted: e.target.checked,
                        })
                      }
                      id="showCompletedTorrents"
                      className="rounded"
                    />
                    <Label htmlFor="showCompletedTorrents">Afficher aussi les torrents terminés</Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ce widget affiche un aperçu de votre client torrent (vitesse de téléchargement, nombre de torrents actifs,
                    et liste des torrents sélectionnés) en utilisant l'intégration configurée.
                  </p>
                </>
              )}

              {selectedWidget === "ping" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={pingForm.title}
                      onChange={(e) => setPingForm({ ...pingForm, title: e.target.value })}
                      placeholder="Nom du serveur"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hôte</Label>
                    <Input
                      value={pingForm.host}
                      onChange={(e) => setPingForm({ ...pingForm, host: e.target.value })}
                      placeholder="example.com ou 192.168.1.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={pingForm.port}
                      onChange={(e) => setPingForm({ ...pingForm, port: parseInt(e.target.value) || 80 })}
                      placeholder="80"
                    />
                  </div>
                </>
              )}

              {selectedWidget === "monitoring" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={monitoringForm.title}
                      onChange={(e) =>
                        setMonitoringForm({
                          ...monitoringForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="Monitoring Serveur"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intégration Monitoring</Label>
                    {loadingIntegrations ? (
                      <p className="text-xs text-muted-foreground">
                        Chargement des intégrations...
                      </p>
                    ) : availableIntegrations.filter((i) => i.type === "monitoring").length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucune intégration de monitoring trouvée. Rendez-vous dans les Paramètres &gt; Intégrations
                        pour en ajouter une, puis revenez ici.
                      </p>
                    ) : (
                      <select
                        value={monitoringForm.integrationId}
                        onChange={(e) =>
                          setMonitoringForm({
                            ...monitoringForm,
                            integrationId: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="">Sélectionner une intégration</option>
                        {availableIntegrations
                          .filter((i) => i.type === "monitoring")
                          .map((integration) => (
                            <option key={integration.id} value={integration.id}>
                              {integration.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ce widget affiche un aperçu de l'état de votre serveur (CPU, mémoire, charge, uptime)
                    en utilisant l'intégration de monitoring configurée.
                  </p>
                </>
              )}

              {selectedWidget === "iframe" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={iframeForm.title}
                      onChange={(e) => setIframeForm({ ...iframeForm, title: e.target.value })}
                      placeholder="Ma page intégrée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de l'iframe</Label>
                    <Input
                      value={iframeForm.iframeUrl}
                      onChange={(e) => setIframeForm({ ...iframeForm, iframeUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </>
              )}

              {selectedWidget === "weather" && (
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={weatherForm.city}
                    onChange={(e) => setWeatherForm({ city: e.target.value })}
                    placeholder="Paris"
                  />
                </div>
              )}

              {selectedWidget === "notes" && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={notesForm.title}
                      onChange={(e) => setNotesForm({ ...notesForm, title: e.target.value })}
                      placeholder="Mes notes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenu initial (optionnel)</Label>
                    <textarea
                      value={notesForm.content}
                      onChange={(e) => setNotesForm({ ...notesForm, content: e.target.value })}
                      placeholder="Commencez à écrire..."
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
                    />
                  </div>
                </>
              )}

              {selectedWidget === "countdown" && (
                <>
                  <div className="space-y-2">
                    <Label>Nom de l'événement</Label>
                    <Input
                      value={countdownForm.countdownTitle}
                      onChange={(e) => setCountdownForm({ ...countdownForm, countdownTitle: e.target.value })}
                      placeholder="Mon événement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de l'événement</Label>
                    <Input
                      type="datetime-local"
                      value={countdownForm.countdownDate.slice(0, 16)}
                      onChange={(e) => setCountdownForm({ ...countdownForm, countdownDate: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emoji</Label>
                    <Input
                      value={countdownForm.countdownEmoji}
                      onChange={(e) => setCountdownForm({ ...countdownForm, countdownEmoji: e.target.value })}
                      placeholder="🎉"
                      maxLength={2}
                    />
                  </div>
                </>
              )}

              {selectedWidget === "datetime" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    L'horloge affichera automatiquement la date et l'heure actuelle.
                    Aucune configuration nécessaire.
                  </p>
                </div>
              )}

              {selectedWidget === "chart" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Le widget graphique sera configuré après sa création.
                    Vous pourrez y ajouter vos données personnalisées.
                  </p>
                </div>
              )}

              {selectedWidget === "anime-calendar" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Affiche les sorties d'anime et manga à venir.
                    Les données sont synchronisées automatiquement avec AniList.
                  </p>
                </div>
              )}

              {selectedWidget === "todo-list" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Créez et gérez vos tâches quotidiennes.
                    Vous pourrez ajouter des tâches après la création du widget.
                  </p>
                </div>
              )}

              {selectedWidget === "watchlist" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Liste de films et séries à regarder.
                    Ajoutez vos contenus favoris après la création.
                  </p>
                </div>
              )}

              {selectedWidget === "timer" && (
                <>
                  <div className="space-y-2 mb-4">
                    <Label>Titre</Label>
                    <Input
                      value={timerForm.title}
                      onChange={(e) => setTimerForm({ ...timerForm, title: e.target.value })}
                      placeholder="Timer de travail"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Pomodoro (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={timerForm.pomodoroMinutes}
                        onChange={(e) => setTimerForm({ 
                          ...timerForm, 
                          pomodoroMinutes: parseInt(e.target.value) || 1,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pause courte (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={timerForm.shortBreakMinutes}
                        onChange={(e) => setTimerForm({ 
                          ...timerForm, 
                          shortBreakMinutes: parseInt(e.target.value) || 1,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pause longue (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={timerForm.longBreakMinutes}
                        onChange={(e) => setTimerForm({ 
                          ...timerForm, 
                          longBreakMinutes: parseInt(e.target.value) || 1,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Mode custom (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={timerForm.customMinutes}
                        onChange={(e) => setTimerForm({ 
                          ...timerForm, 
                          customMinutes: parseInt(e.target.value) || 1,
                        })}
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedWidget === "bookmarks" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Organisez vos liens favoris.
                    Ajoutez et catégorisez vos favoris après la création.
                  </p>
                </div>
              )}

              {selectedWidget === "quote" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Citation inspirante du jour.
                    Une nouvelle citation s'affiche automatiquement chaque jour.
                  </p>
                </div>
              )}

              {selectedWidget === "universal-calendar" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Calendrier complet regroupant tous vos événements :
                    anime, manga, films, séries TV et événements personnels.
                  </p>
                </div>
              )}

              {selectedWidget === "movies-tv-calendar" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Suivez les sorties cinéma et les nouvelles séries TV.
                    Données synchronisées avec The Movie Database (TMDb).
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {step === "configure" && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              Retour
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Création..." : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Valider
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
