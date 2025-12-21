"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Check
} from "lucide-react";
import type { Widget } from "@/lib/db/schema";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onWidgetAdded?: (widget: Widget) => void;
}

type WidgetType = "link" | "ping" | "iframe" | "datetime" | "weather" | "notes" | "chart" | "anime-calendar" | "todo-list" | "watchlist" | "timer" | "bookmarks" | "quote" | "countdown" | "universal-calendar" | "movies-tv-calendar";

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
];

export function AddWidgetDialogModern({ open, onOpenChange, dashboardId, onWidgetAdded }: AddWidgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedWidget, setSelectedWidget] = useState<WidgetType | null>(null);

  // Formulaires pour chaque type
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "🔗", openInNewTab: true });
  const [pingForm, setPingForm] = useState({ title: "", host: "", port: 80 });
  const [iframeForm, setIframeForm] = useState({ title: "", iframeUrl: "" });
  const [weatherForm, setWeatherForm] = useState({ city: "Paris" });
  const [notesForm, setNotesForm] = useState({ title: "Notes", content: "" });
  const [chartForm, setChartForm] = useState({ title: "Statistiques", chartType: "bar" });
  const [animeForm, setAnimeForm] = useState({ defaultTab: "anime", daysToShow: 7 });
  const [todoForm, setTodoForm] = useState({ title: "Todo List", todos: [] });
  const [watchlistForm, setWatchlistForm] = useState({ title: "Watchlist", watchlist: [] });
  const [timerForm, setTimerForm] = useState({ title: "Timer" });
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

  const handleWidgetSelect = (type: WidgetType) => {
    setSelectedWidget(type);
    setStep("configure");
  };

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
          categoryId: null,
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
                return (
                  <button
                    key={widget.type}
                    onClick={() => handleWidgetSelect(widget.type)}
                    className="group relative overflow-hidden rounded-xl border-2 border-transparent hover:border-primary/50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${widget.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
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
                    <Input
                      value={linkForm.icon}
                      onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                      placeholder="🔗"
                      maxLength={2}
                    />
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
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Minuteur et chronomètre intégrés.
                    Configurez vos sessions de travail directement dans le widget.
                  </p>
                </div>
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
