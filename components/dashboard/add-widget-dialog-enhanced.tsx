"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createWidget } from "@/lib/actions/widgets";
import { Link as LinkIcon, Activity, Frame, Clock, Cloud, StickyNote, BarChart3, Calendar, CheckSquare, Eye, Timer, Bookmark, Quote, CalendarClock, Film, CalendarRange } from "lucide-react";
import type { Widget } from "@/lib/db/schema";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onWidgetAdded?: (widget: Widget) => void;
}

type WidgetType = "link" | "ping" | "iframe" | "datetime" | "weather" | "notes" | "chart" | "anime-calendar" | "todo-list" | "watchlist" | "timer" | "bookmarks" | "quote" | "countdown" | "universal-calendar" | "movies-tv-calendar";

export function AddWidgetDialogEnhanced({ open, onOpenChange, dashboardId, onWidgetAdded }: AddWidgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [widgetType, setWidgetType] = useState<WidgetType>("link");

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
  const [countdownForm, setCountdownForm] = useState({ countdownTitle: "My Event", countdownDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), countdownEmoji: "🎉" });
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let options: any = {};
      let defaultSize = { w: 2, h: 2 };

      switch (widgetType) {
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
        type: widgetType,
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

      // Reset forms
      setLinkForm({ title: "", url: "", icon: "🔗", openInNewTab: true });
      setPingForm({ title: "", host: "", port: 80 });
      setIframeForm({ title: "", iframeUrl: "" });
      setWeatherForm({ city: "Paris" });
      setNotesForm({ title: "Notes", content: "" });
      setChartForm({ title: "Statistiques", chartType: "bar" });
      setAnimeForm({ defaultTab: "anime", daysToShow: 7 });
      setTodoForm({ title: "Todo List", todos: [] });
      setWatchlistForm({ title: "Watchlist", watchlist: [] });
      setTimerForm({ title: "Timer" });
      setBookmarksForm({ title: "Bookmarks", bookmarks: [] });
      setQuoteForm({ title: "Quote of the Day" });
      setCountdownForm({ countdownTitle: "My Event", countdownDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), countdownEmoji: "🎉" });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la création du widget:", error);
      alert("Erreur lors de la création du widget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un Widget</DialogTitle>
          <DialogDescription>
            Choisissez le type de widget à ajouter à votre dashboard
          </DialogDescription>
        </DialogHeader>

        <Tabs value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <TabsList className="inline-flex w-max h-auto gap-1 p-1 bg-muted/50">
              <TabsTrigger value="link" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LinkIcon className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Lien</span>
              </TabsTrigger>
              <TabsTrigger value="ping" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Ping</span>
              </TabsTrigger>
              <TabsTrigger value="iframe" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Frame className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Iframe</span>
              </TabsTrigger>
              <TabsTrigger value="datetime" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Horloge</span>
              </TabsTrigger>
              <TabsTrigger value="weather" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Cloud className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Météo</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <StickyNote className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Notes</span>
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Graphique</span>
              </TabsTrigger>
              <TabsTrigger value="anime-calendar" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Animé</span>
              </TabsTrigger>
              <TabsTrigger value="todo-list" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Todo</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Watchlist</span>
              </TabsTrigger>
              <TabsTrigger value="timer" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Timer className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Timer</span>
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bookmark className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Favoris</span>
              </TabsTrigger>
              <TabsTrigger value="quote" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Quote className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Citation</span>
              </TabsTrigger>
              <TabsTrigger value="countdown" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CalendarClock className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Compte à rebours</span>
              </TabsTrigger>
              <TabsTrigger value="universal-calendar" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CalendarRange className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Calendrier universel</span>
              </TabsTrigger>
              <TabsTrigger value="movies-tv-calendar" className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Film className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Films & Séries</span>
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* Link Widget */}
          <TabsContent value="link" className="space-y-4 mt-4">
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
              />
              <Label htmlFor="openInNewTab">Ouvrir dans un nouvel onglet</Label>
            </div>
          </TabsContent>

          {/* Weather Widget */}
          <TabsContent value="weather" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={weatherForm.city}
                onChange={(e) => setWeatherForm({ city: e.target.value })}
                placeholder="Paris"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-1">ℹ️ Information</p>
              <p className="text-muted-foreground">
                Ce widget affiche la météo actuelle pour la ville choisie. Les données sont actualisées toutes les 5 minutes.
              </p>
            </div>
          </TabsContent>

          {/* Notes Widget */}
          <TabsContent value="notes" className="space-y-4 mt-4">
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
                placeholder="Commencez à écrire vos notes..."
                className="w-full h-32 px-3 py-2 border rounded-md bg-background resize-none"
              />
            </div>
          </TabsContent>

          {/* Chart Widget */}
          <TabsContent value="chart" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={chartForm.title}
                onChange={(e) => setChartForm({ ...chartForm, title: e.target.value })}
                placeholder="Mes statistiques"
              />
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-1">📊 Graphique Statistiques</p>
              <p className="text-muted-foreground">
                Affiche des statistiques sous forme de graphique en barres. Les données sont générées aléatoirement pour la démo.
              </p>
            </div>
          </TabsContent>

          {/* Garde les autres tabs (ping, iframe, datetime) de l'ancien composant */}
          <TabsContent value="ping" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={pingForm.title}
                onChange={(e) => setPingForm({ ...pingForm, title: e.target.value })}
                placeholder="Mon serveur"
              />
            </div>
            <div className="space-y-2">
              <Label>Hôte</Label>
              <Input
                value={pingForm.host}
                onChange={(e) => setPingForm({ ...pingForm, host: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={pingForm.port}
                onChange={(e) => setPingForm({ ...pingForm, port: Number(e.target.value) })}
                placeholder="80"
              />
            </div>
          </TabsContent>

          <TabsContent value="iframe" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={iframeForm.title}
                onChange={(e) => setIframeForm({ ...iframeForm, title: e.target.value })}
                placeholder="Ma page"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={iframeForm.iframeUrl}
                onChange={(e) => setIframeForm({ ...iframeForm, iframeUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="datetime" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-1">🕐 Widget Horloge</p>
              <p className="text-muted-foreground">
                Affiche l'heure et la date actuelles avec mise à jour en temps réel.
              </p>
            </div>
          </TabsContent>

          {/* Anime Calendar Widget */}
          <TabsContent value="anime-calendar" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Onglet par défaut</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={animeForm.defaultTab}
                onChange={(e) => setAnimeForm({ ...animeForm, defaultTab: e.target.value as any })}
              >
                <option value="anime">Anime</option>
                <option value="manga">Manga</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nombre de jours à afficher</Label>
              <Input
                type="number"
                value={animeForm.daysToShow}
                onChange={(e) => setAnimeForm({ ...animeForm, daysToShow: Number(e.target.value) })}
                min={1}
                max={14}
              />
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendrier Anime & Manga
              </p>
              <p className="text-muted-foreground mb-2">
                Affiche les sorties d'épisodes d'anime et les chapitres de manga à venir.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Calendrier hebdomadaire des sorties</li>
                <li>Covers et informations détaillées</li>
                <li>Filtres par jour de la semaine</li>
                <li>Liens directs vers AniList</li>
                <li>Scores et genres</li>
              </ul>
            </div>
          </TabsContent>

          {/* Todo List Widget */}
          <TabsContent value="todo-list" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Liste de Tâches
              </p>
              <p className="text-muted-foreground mb-2">
                Gérez vos tâches quotidiennes avec des priorités et un suivi de progression.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Checkbox pour marquer les tâches complétées</li>
                <li>3 niveaux de priorité (Low, Medium, High)</li>
                <li>Barre de progression</li>
                <li>Suppression rapide</li>
              </ul>
            </div>
          </TabsContent>

          {/* Watchlist Widget */}
          <TabsContent value="watchlist" className="space-y-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Watchlist Films & Séries
              </p>
              <p className="text-muted-foreground mb-2">
                Suivez vos films, séries et animes à regarder.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>3 catégories: Movie, Series, Anime</li>
                <li>3 statuts: To Watch, Watching, Watched</li>
                <li>Système de notation (1-5 étoiles)</li>
                <li>Filtres par statut</li>
              </ul>
            </div>
          </TabsContent>

          {/* Timer Widget */}
          <TabsContent value="timer" className="space-y-4 mt-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Timer Pomodoro
              </p>
              <p className="text-muted-foreground mb-2">
                Timer avec technique Pomodoro pour améliorer votre productivité.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Pomodoro: 25 minutes de travail</li>
                <li>Short Break: 5 minutes de pause</li>
                <li>Long Break: 15 minutes de pause</li>
                <li>Notifications de fin de session</li>
                <li>Suivi du nombre de sessions</li>
              </ul>
            </div>
          </TabsContent>

          {/* Bookmarks Widget */}
          <TabsContent value="bookmarks" className="space-y-4 mt-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Favoris / Bookmarks
              </p>
              <p className="text-muted-foreground mb-2">
                Collection organisée de vos liens favoris.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Favicons automatiques</li>
                <li>6 catégories: Work, Social, Dev, Tools, Entertainment, Other</li>
                <li>Système de favoris (étoiles)</li>
                <li>Ouverture dans nouvel onglet</li>
              </ul>
            </div>
          </TabsContent>

          {/* Quote Widget */}
          <TabsContent value="quote" className="space-y-4 mt-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Quote className="h-4 w-4" />
                Citation du Jour
              </p>
              <p className="text-muted-foreground mb-2">
                Citations inspirantes pour commencer votre journée.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Citation différente chaque jour</li>
                <li>Collection de 15+ citations</li>
                <li>Bouton pour nouvelle citation aléatoire</li>
                <li>Partage et copie rapide</li>
                <li>Like pour sauvegarder vos préférées</li>
              </ul>
            </div>
          </TabsContent>

          {/* Countdown Widget */}
          <TabsContent value="countdown" className="space-y-4 mt-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Compte à Rebours
              </p>
              <p className="text-muted-foreground mb-2">
                Comptez les jours jusqu'à un événement important.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Affichage jours, heures, minutes, secondes</li>
                <li>Personnalisation du titre et emoji</li>
                <li>Date et heure configurables</li>
                <li>Animation célébration quand terminé</li>
              </ul>
            </div>
          </TabsContent>

          {/* Universal Calendar Widget */}
          <TabsContent value="universal-calendar" className="space-y-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                Calendrier Universel
              </p>
              <p className="text-muted-foreground mb-2">
                Le calendrier ultime combinant TOUS vos médias et événements personnels.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>📺 Anime & Manga (AniList)</li>
                <li>🎬 Films & Séries TV (TMDb)</li>
                <li>📝 Événements personnels</li>
                <li>Vues mois, semaine et liste</li>
                <li>Toggle sources individuellement</li>
                <li>Couleurs personnalisables par type</li>
                <li>Ajout/édition/suppression d'événements</li>
                <li>Contrôle total de l'affichage</li>
              </ul>
            </div>
          </TabsContent>

          {/* Movies & TV Calendar Widget */}
          <TabsContent value="movies-tv-calendar" className="space-y-4 mt-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Calendrier Films & Séries TV
              </p>
              <p className="text-muted-foreground mb-2">
                Suivez les sorties et diffusions de films et séries TV.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>🎬 Films à venir et tendances</li>
                <li>📺 Séries TV en diffusion</li>
                <li>Basé sur TMDb (The Movie Database)</li>
                <li>Filtres jour/semaine</li>
                <li>Affiches et notes</li>
                <li>Liens vers TMDb</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le Widget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
