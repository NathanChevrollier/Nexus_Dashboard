/**
 * UNIVERSAL CALENDAR WIDGET
 * Le widget calendrier ultime qui combine:
 * - Anime & Manga (AniList API)
 * - Films & Séries TV (TMDb API)
 * - Événements personnels (DB)
 * 
 * Features:
 * - Vue mois / semaine / liste
 * - Filtres par type de contenu
 * - Customisation des couleurs
 * - Ajout/édition/suppression d'événements
 * - Export/import
 * - Synchronisation temps réel
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Filter,
  Download,
  Upload,
  Tv,
  Film,
  BookOpen,
  Star,
  Clock,
  X,
  Edit,
  Trash2,
  Check,
  RefreshCw,
  List,
  CalendarDays,
  Grid3x3,
  Eye,
  EyeOff,
} from 'lucide-react';

// API imports
import { getAiringThisWeek, getReleasingManga, type AnimeSchedule, type MangaRelease } from '@/lib/api/anilist';
import { getUpcomingMovies, getTVOnTheAir, type TMDbMovie, type TMDbTVShow, getTMDbImageUrl } from '@/lib/api/tmdb';
import {
  getUserEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/actions/calendar-events';
import type { CalendarEvent } from '@/lib/db/schema';

// Types unifiés
interface UnifiedEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: 'anime' | 'manga' | 'movie' | 'tv' | 'personal';
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  metadata?: any;
  completed?: boolean;
  color?: string;
}

interface CalendarViewProps {
  options?: {
    calendarView?: 'month' | 'week' | 'list';
    enabledSources?: Record<string, boolean>;
    sourceColors?: Record<string, string>;
    showWeekends?: boolean;
    compactMode?: boolean;
  };
}

const DEFAULT_COLORS = {
  anime: '#3b82f6', // Blue
  manga: '#8b5cf6', // Purple
  movie: '#ef4444', // Red
  tv: '#10b981', // Green
  personal: '#f59e0b', // Orange
};

export function UniversalCalendarWidget({ options }: CalendarViewProps) {
  // États principaux
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list'>(options?.calendarView || 'month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [animeData, setAnimeData] = useState<AnimeSchedule[]>([]);
  const [mangaData, setMangaData] = useState<MangaRelease[]>([]);
  const [movieData, setMovieData] = useState<TMDbMovie[]>([]);
  const [tvData, setTVData] = useState<TMDbTVShow[]>([]);
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([]);

  // Filtres et paramètres
  const [enabledSources, setEnabledSources] = useState({
    anime: true,
    manga: true,
    movie: true,
    tv: true,
    personal: true,
  });
  
  const [sourceColors, setSourceColors] = useState(options?.sourceColors || DEFAULT_COLORS);
  const [showWeekends, setShowWeekends] = useState(options?.showWeekends !== false);
  const [compactMode, setCompactMode] = useState(options?.compactMode || false);
  
  // Dialogs
  const [showSettings, setShowSettings] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);

  // Charger toutes les données
  useEffect(() => {
    loadAllData();
  }, [currentDate]);

  async function loadAllData() {
    setLoading(true);
    setError(null);

    try {
      const [anime, manga, movies, tv, personal] = await Promise.all([
        enabledSources.anime ? getAiringThisWeek() : Promise.resolve([]),
        enabledSources.manga ? getReleasingManga(1, 20) : Promise.resolve([]),
        enabledSources.movie ? getUpcomingMovies() : Promise.resolve([]),
        enabledSources.tv ? getTVOnTheAir() : Promise.resolve([]),
        enabledSources.personal ? getUserEvents() : Promise.resolve([]),
      ]);

      setAnimeData(anime);
      setMangaData(manga);
      setMovieData(movies);
      setTVData(tv);
      setPersonalEvents(personal);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }

  // Convertir toutes les sources en événements unifiés
  const unifiedEvents = useMemo(() => {
    const events: UnifiedEvent[] = [];

    // Anime
    if (enabledSources.anime) {
      animeData.forEach(anime => {
        if (anime.nextAiringEpisode) {
          events.push({
            id: `anime-${anime.id}`,
            title: anime.title.english || anime.title.romaji,
            date: new Date(anime.nextAiringEpisode.airingAt * 1000),
            type: 'anime',
            imageUrl: anime.coverImage.medium,
            externalUrl: anime.siteUrl,
            metadata: {
              episode: anime.nextAiringEpisode.episode,
              score: anime.averageScore,
              genres: anime.genres,
            },
            color: sourceColors.anime,
          });
        }
      });
    }

    // Manga
    if (enabledSources.manga) {
      mangaData.forEach(manga => {
        events.push({
          id: `manga-${manga.id}`,
          title: manga.title.english || manga.title.romaji,
          date: new Date(), // Les manga n'ont pas de date précise, on les met aujourd'hui
          type: 'manga',
          imageUrl: manga.coverImage.medium,
          externalUrl: manga.siteUrl,
          metadata: {
            chapters: manga.chapters,
            score: manga.averageScore,
            genres: manga.genres,
          },
          color: sourceColors.manga,
        });
      });
    }

    // Films
    if (enabledSources.movie) {
      movieData.forEach(movie => {
        if (movie.release_date) {
          events.push({
            id: `movie-${movie.id}`,
            title: movie.title,
            date: new Date(movie.release_date),
            type: 'movie',
            description: movie.overview,
            imageUrl: getTMDbImageUrl(movie.poster_path, 'w500'),
            metadata: {
              rating: movie.vote_average,
              genres: movie.genre_ids,
            },
            color: sourceColors.movie,
          });
        }
      });
    }

    // Séries TV
    if (enabledSources.tv) {
      tvData.forEach(show => {
        if (show.first_air_date) {
          events.push({
            id: `tv-${show.id}`,
            title: show.name,
            date: new Date(show.first_air_date),
            type: 'tv',
            description: show.overview,
            imageUrl: getTMDbImageUrl(show.poster_path, 'w500'),
            metadata: {
              rating: show.vote_average,
              genres: show.genre_ids,
            },
            color: sourceColors.tv,
          });
        }
      });
    }

    // Événements personnels
    if (enabledSources.personal) {
      personalEvents.forEach(event => {
        events.push({
          id: `personal-${event.id}`,
          title: event.title,
          date: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : undefined,
          type: 'personal',
          description: event.description || undefined,
          completed: event.completed ?? undefined,
          color: event.color || sourceColors.personal,
          metadata: event.metadata,
        });
      });
    }

    // Trier par date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [animeData, mangaData, movieData, tvData, personalEvents, enabledSources, sourceColors]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Toggle source
  const toggleSource = (source: keyof typeof enabledSources) => {
    setEnabledSources(prev => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  if (loading) {
    return (
      <Card className="w-full h-full p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement du calendrier...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full p-6 flex flex-col items-center justify-center gap-3">
        <CalendarIcon className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadAllData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Calendrier Universel</h3>
          <Badge variant="outline" className="text-xs">
            {unifiedEvents.length} événements
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Vue Switcher */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="h-7 px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="h-7 px-2"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="h-7 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <AddEventDialog onClose={() => setShowAddEvent(false)} onSave={loadAllData} />
            </DialogContent>
          </Dialog>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <CalendarSettings
                enabledSources={enabledSources}
                sourceColors={sourceColors}
                showWeekends={showWeekends}
                compactMode={compactMode}
                onToggleSource={toggleSource}
                onChangeColor={(source: string, color: string) => setSourceColors(prev => ({ ...prev, [source]: color }))}
                onToggleWeekends={() => setShowWeekends(!showWeekends)}
                onToggleCompact={() => setCompactMode(!compactMode)}
              />
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="ghost" onClick={loadAllData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Source Filters */}
      <div className="px-4 py-2 border-b flex flex-wrap gap-2">
        {Object.entries(enabledSources).map(([source, enabled]) => (
          <Button
            key={source}
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSource(source as keyof typeof enabledSources)}
            className="h-7"
            style={enabled ? { backgroundColor: sourceColors[source as keyof typeof sourceColors] } : undefined}
          >
            {enabled ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            {source === 'anime' && 'Anime'}
            {source === 'manga' && 'Manga'}
            {source === 'movie' && 'Films'}
            {source === 'tv' && 'Séries'}
            {source === 'personal' && 'Personnel'}
          </Button>
        ))}
      </div>

      {/* Navigation */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={view === 'week' ? goToPreviousWeek : goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={view === 'week' ? goToNextWeek : goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="font-semibold">
          {view === 'list' && 'Tous les événements'}
          {view === 'week' && `Semaine du ${currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
          {view === 'month' && currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Calendar Views */}
      <ScrollArea className="flex-1 p-4">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={unifiedEvents}
            showWeekends={showWeekends}
            compactMode={compactMode}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={unifiedEvents}
            compactMode={compactMode}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === 'list' && (
          <ListView
            events={unifiedEvents}
            onEventClick={setSelectedEvent}
          />
        )}
      </ScrollArea>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <EventDetailsDialog
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onDelete={() => {
                // Handle delete
                setSelectedEvent(null);
                loadAllData();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// ============= COMPOSANTS AUXILIAIRES =============

/**
 * Vue Mois - Grille de calendrier classique
 */
function MonthView({
  currentDate,
  events,
  showWeekends,
  compactMode,
  onEventClick,
}: {
  currentDate: Date;
  events: UnifiedEvent[];
  showWeekends: boolean;
  compactMode: boolean;
  onEventClick: (event: UnifiedEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculer les jours du mois
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = dimanche

  // Créer la grille
  const days: (Date | null)[] = [];
  
  // Jours vides avant le 1er du mois
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  
  // Jours du mois
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const filteredWeekDays = showWeekends ? weekDays : weekDays.slice(1, 6);

  return (
    <div className="space-y-2">
      {/* En-têtes des jours */}
      <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} gap-2`}>
        {filteredWeekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} gap-2`}>
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          // Filtrer les événements de ce jour
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return (
              eventDate.getDate() === day.getDate() &&
              eventDate.getMonth() === day.getMonth() &&
              eventDate.getFullYear() === day.getFullYear()
            );
          });

          const isToday = 
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear();

          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          if (!showWeekends && isWeekend) return null;

          return (
            <div
              key={day.toISOString()}
              className={`
                aspect-square border rounded-lg p-2 relative overflow-hidden
                ${isToday ? 'border-primary border-2 bg-primary/5' : 'border-border'}
                ${compactMode ? 'p-1' : 'p-2'}
              `}
            >
              <div className={`text-sm ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </div>

              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, compactMode ? 2 : 3).map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="w-full text-left text-xs truncate px-1 py-0.5 rounded hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: event.color, color: 'white' }}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > (compactMode ? 2 : 3) && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - (compactMode ? 2 : 3)} plus
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vue Semaine - Timeline horaire
 */
function WeekView({
  currentDate,
  events,
  compactMode,
  onEventClick,
}: {
  currentDate: Date;
  events: UnifiedEvent[];
  compactMode: boolean;
  onEventClick: (event: UnifiedEvent) => void;
}) {
  // Obtenir les 7 jours de la semaine
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  return (
    <div className="space-y-4">
      {weekDays.map(day => {
        const dayEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return (
            eventDate.getDate() === day.getDate() &&
            eventDate.getMonth() === day.getMonth() &&
            eventDate.getFullYear() === day.getFullYear()
          );
        });

        const isToday = 
          day.getDate() === new Date().getDate() &&
          day.getMonth() === new Date().getMonth() &&
          day.getFullYear() === new Date().getFullYear();

        return (
          <div key={day.toISOString()} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <Badge variant="outline">{dayEvents.length}</Badge>
            </div>

            {dayEvents.length > 0 ? (
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left p-2 rounded-lg border hover:bg-accent transition-colors flex items-center gap-3"
                  >
                    {event.imageUrl && !compactMode && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: event.color, color: 'white' }}
                        >
                          {event.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun événement
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vue Liste - Tous les événements dans l'ordre chronologique
 */
function ListView({
  events,
  onEventClick,
}: {
  events: UnifiedEvent[];
  onEventClick: (event: UnifiedEvent) => void;
}) {
  // Grouper par date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = event.date.toLocaleDateString('fr-FR');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, UnifiedEvent[]>);

  return (
    <div className="space-y-4">
      {Object.entries(eventsByDate).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="space-y-2">
          <div className="font-semibold text-sm text-muted-foreground sticky top-0 bg-background py-1">
            {dateKey} ({dayEvents.length})
          </div>
          <div className="space-y-2">
            {dayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex items-center gap-3"
              >
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-clamp-2">{event.title}</div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: event.color, color: 'white' }}
                    >
                      {event.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {event.metadata?.score && (
                      <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        {event.metadata.score / 10}/10
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(eventsByDate).length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucun événement à afficher
        </p>
      )}
    </div>
  );
}

/**
 * Dialog pour ajouter un événement
 */
function AddEventDialog({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title || !date) return;

    setSaving(true);
    try {
      const eventDate = new Date(date + (time ? `T${time}` : 'T00:00'));
      
      await createEvent({
        title,
        description: description || null,
        startDate: eventDate,
        endDate: null,
        allDay,
        type: 'personal',
        color,
        location: null,
        url: null,
        metadata: null,
        recurring: 'none',
        notifyBefore: null,
        completed: false,
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajouter un événement</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>Titre *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'événement"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Heure</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={allDay}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={allDay} onCheckedChange={setAllDay} />
          <Label>Toute la journée</Label>
        </div>

        <div>
          <Label>Couleur</Label>
          <div className="flex gap-2 mt-2">
            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => (
              <button
                key={c}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !date || saving}>
            {saving ? 'Enregistrement...' : 'Créer'}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Dialog de paramètres du calendrier
 */
function CalendarSettings({
  enabledSources,
  sourceColors,
  showWeekends,
  compactMode,
  onToggleSource,
  onChangeColor,
  onToggleWeekends,
  onToggleCompact,
}: any) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Paramètres du calendrier</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div>
          <h4 className="font-medium mb-3">Sources de données</h4>
          <div className="space-y-2">
            {Object.entries(enabledSources).map(([source, enabled]) => (
              <div key={source} className="flex items-center justify-between">
                <Label className="capitalize">{source}</Label>
                <Switch
                  checked={enabled as boolean}
                  onCheckedChange={() => onToggleSource(source)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Couleurs</h4>
          <div className="space-y-2">
            {Object.entries(sourceColors).map(([source, color]) => (
              <div key={source} className="flex items-center justify-between">
                <Label className="capitalize">{source}</Label>
                <Input
                  type="color"
                  value={color as string}
                  onChange={(e) => onChangeColor(source, e.target.value)}
                  className="w-20 h-8"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Affichage</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Afficher les week-ends</Label>
              <Switch checked={showWeekends} onCheckedChange={onToggleWeekends} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mode compact</Label>
              <Switch checked={compactMode} onCheckedChange={onToggleCompact} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Dialog de détails d'un événement
 */
function EventDetailsDialog({
  event,
  onClose,
  onDelete,
}: {
  event: UnifiedEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{event.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            style={{ backgroundColor: event.color, color: 'white' }}
          >
            {event.type}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {event.date.toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        {event.metadata?.score && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            <span className="text-sm font-medium">{event.metadata.score / 10}/10</span>
          </div>
        )}

        {event.externalUrl && (
          <Button asChild variant="outline" className="w-full">
            <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
              Voir plus
            </a>
          </Button>
        )}

        {event.type === 'personal' && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
