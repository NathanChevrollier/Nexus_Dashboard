'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  List,
  CalendarDays,
  Grid3x3,
  RefreshCw,
  Clock,
  ExternalLink,
  Trash2,
  MapPin,
  Star,
  Tv,
  Film,
  BookOpen,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- IMPORTS API RÉELS ---
import { getAiringThisWeek, getReleasingManga } from '@/lib/api/anilist';
import { getUpcomingMovies, getTVOnTheAir, getTMDbImageUrl } from '@/lib/api/tmdb';
import { getUserEvents, createEvent, deleteEvent } from '@/lib/actions/calendar-events';

// --- TYPES ---
interface UnifiedEvent {
  id: string;
  title: string;
  date: Date;
  type: 'anime' | 'manga' | 'movie' | 'tv' | 'personal';
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  color?: string;
  metadata?: any;
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
  const [events, setEvents] = useState<UnifiedEvent[]>([]);

  // Configuration
  const [enabledSources, setEnabledSources] = useState({
    anime: true, manga: true, movie: true, tv: true, personal: true,
  });
  const [sourceColors, setSourceColors] = useState(options?.sourceColors || DEFAULT_COLORS);
  const [showWeekends, setShowWeekends] = useState(options?.showWeekends !== false);
  const [compactMode, setCompactMode] = useState(options?.compactMode || false);
  
  // États d'interface (Modales)
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null); // Pour la pop-up "Voir la journée"
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // --- CHARGEMENT DES DONNÉES (API RÉELLES) ---
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Appels parallèles aux API si la source est activée
      const [animeData, mangaData, movieData, tvData, personalData] = await Promise.all([
        enabledSources.anime ? getAiringThisWeek() : Promise.resolve([]),
        enabledSources.manga ? getReleasingManga(1, 20) : Promise.resolve([]),
        enabledSources.movie ? getUpcomingMovies() : Promise.resolve([]),
        enabledSources.tv ? getTVOnTheAir() : Promise.resolve([]),
        enabledSources.personal ? getUserEvents() : Promise.resolve([]),
      ]);

      const newEvents: UnifiedEvent[] = [];

      // 2. Transformation : Anime
      if (animeData) {
        animeData.forEach((anime: any) => {
          if (anime.nextAiringEpisode) {
            newEvents.push({
              id: `anime-${anime.id}`,
              title: anime.title.english || anime.title.romaji,
              date: new Date(anime.nextAiringEpisode.airingAt * 1000),
              type: 'anime',
              imageUrl: anime.coverImage.medium,
              externalUrl: anime.siteUrl,
              color: sourceColors.anime,
              description: `Épisode ${anime.nextAiringEpisode.episode}`,
              metadata: { score: anime.averageScore, genres: anime.genres }
            });
          }
        });
      }

      // 3. Transformation : Manga
      if (mangaData) {
        mangaData.forEach((manga: any) => {
          newEvents.push({
            id: `manga-${manga.id}`,
            title: manga.title.english || manga.title.romaji,
            date: new Date(), // Manga = Date du jour par défaut (souvent imprécis)
            type: 'manga',
            imageUrl: manga.coverImage.medium,
            externalUrl: manga.siteUrl,
            color: sourceColors.manga,
            description: manga.chapters ? `Chapitre ${manga.chapters}` : 'Nouveau volume',
            metadata: { score: manga.averageScore, genres: manga.genres }
          });
        });
      }

      // 4. Transformation : Films
      if (movieData) {
        movieData.forEach((movie: any) => {
          if (movie.release_date) {
            newEvents.push({
              id: `movie-${movie.id}`,
              title: movie.title,
              date: new Date(movie.release_date),
              type: 'movie',
              imageUrl: getTMDbImageUrl(movie.poster_path, 'w500') ?? undefined,
              description: movie.overview,
              color: sourceColors.movie,
              metadata: { rating: movie.vote_average }
            });
          }
        });
      }

      // 5. Transformation : Séries TV
      if (tvData) {
        tvData.forEach((show: any) => {
          if (show.first_air_date) {
            newEvents.push({
              id: `tv-${show.id}`,
              title: show.name,
              date: new Date(show.first_air_date),
              type: 'tv',
              imageUrl: getTMDbImageUrl(show.poster_path, 'w500') ?? undefined,
              description: show.overview,
              color: sourceColors.tv,
              metadata: { rating: show.vote_average }
            });
          }
        });
      }

      // 6. Transformation : Personnel
      if (personalData) {
        personalData.forEach((event: any) => {
          newEvents.push({
            id: `personal-${event.id}`,
            title: event.title,
            date: new Date(event.startDate),
            type: 'personal',
            description: event.description,
            color: event.color || sourceColors.personal,
          });
        });
      }

      setEvents(newEvents);
    } catch (error) {
      console.error("Erreur chargement calendrier:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate, enabledSources]); // Recharge si on change de mois ou de filtres

  // --- ACTIONS ---

  const handleDeleteEvent = async (id: string) => {
    // On ne supprime que les événements personnels (ceux qui ont un ID type 'personal-123')
    if (id.startsWith('personal-')) {
      const realId = id.replace('personal-', '');
      await deleteEvent(realId);
      loadData(); // Recharger
      setSelectedEvent(null);
    }
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const modifier = direction === 'next' ? 1 : -1;
    if (view === 'month') newDate.setMonth(newDate.getMonth() + modifier);
    else if (view === 'week') newDate.setDate(newDate.getDate() + (modifier * 7));
    setCurrentDate(newDate);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => enabledSources[e.type]);
  }, [events, enabledSources]);

  return (
    <Card className="w-full h-full flex flex-col bg-card/50 overflow-hidden relative group">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm z-10 shrink-0 h-16">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => navigate('prev')}>
             <ChevronLeft className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="sm" className="font-bold text-lg min-w-[140px] capitalize" onClick={() => navigate('today')}>
             {view === 'month' && currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
             {view === 'week' && `Sem. ${currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
             {view === 'list' && "Agenda"}
           </Button>
           <Button variant="ghost" size="icon" onClick={() => navigate('next')}>
             <ChevronRight className="h-5 w-5" />
           </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
          {(['month', 'week', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "p-2 rounded-md transition-all",
                view === v ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              title={v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Liste'}
            >
              {v === 'month' && <Grid3x3 className="h-4 w-4" />}
              {v === 'week' && <CalendarDays className="h-4 w-4" />}
              {v === 'list' && <List className="h-4 w-4" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
           <Button variant="default" size="icon" onClick={() => setIsAddOpen(true)} className="rounded-full shadow-md">
             <Plus className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
             <Settings className="h-5 w-5 text-muted-foreground" />
           </Button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 bg-background/20 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20 backdrop-blur-sm">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="h-full p-4 overflow-y-auto">
          {view === 'month' && (
            <MonthView 
              date={currentDate} 
              events={filteredEvents} 
              showWeekends={showWeekends} 
              compact={compactMode}
              onSelectEvent={setSelectedEvent}
              onSelectDay={setSelectedDay}
            />
          )}
          {view === 'week' && (
            <WeekView 
              date={currentDate} 
              events={filteredEvents} 
              onSelectEvent={setSelectedEvent}
            />
          )}
          {view === 'list' && (
            <ListView 
              events={filteredEvents} 
              onSelectEvent={setSelectedEvent}
            />
          )}
        </div>
      </div>

      {/* --- DIALOGS --- */}
      
      {/* 1. Paramètres */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader><DialogTitle>Affichage</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sources</Label>
              {Object.entries(enabledSources).map(([source, enabled]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm capitalize">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sourceColors[source as keyof typeof sourceColors] }} />
                    {source}
                  </div>
                  <Switch checked={enabled} onCheckedChange={(c) => setEnabledSources(p => ({...p, [source]: c}))} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <Label>Week-ends</Label>
              <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mode Compact</Label>
              <Switch checked={compactMode} onCheckedChange={setCompactMode} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Ajout Rapide */}
      <AddEventDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSave={loadData} />
      
      {/* 3. Détails Événement */}
      {selectedEvent && (
        <EventDetailsDialog 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onDelete={() => handleDeleteEvent(selectedEvent.id)} 
        />
      )}

      {/* 4. Détails JOURNÉE (Le remède aux "50 trucs") */}
      {selectedDay && (
        <DayDetailsDialog 
          date={selectedDay}
          events={filteredEvents.filter(e => e.date.toDateString() === selectedDay.toDateString())}
          onClose={() => setSelectedDay(null)}
          onSelectEvent={(e: UnifiedEvent) => { setSelectedEvent(e); setSelectedDay(null); }}
        />
      )}

    </Card>
  );
}

// =======================
// VUE MOIS (Optimisée)
// =======================
function MonthView({ date, events, showWeekends, compact, onSelectEvent, onSelectDay }: any) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1); // Lun=0
  const totalSlots = startOffset + daysInMonth;
  const rows = Math.ceil(totalSlots / 7);

  const days = Array.from({ length: rows * 7 }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum <= 0 || dayNum > daysInMonth) return null;
    return new Date(year, month, dayNum);
  });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d, i) => {
          if (!showWeekends && i > 4) return null;
          return <div key={d} className="text-center text-xs font-bold text-muted-foreground uppercase">{d}</div>
        })}
      </div>
      
      <div className={cn("grid gap-2 flex-1 auto-rows-fr", showWeekends ? "grid-cols-7" : "grid-cols-5")}>
        {days.map((day, i) => {
          const dayOfWeek = (i % 7);
          if (!showWeekends && dayOfWeek > 4) return null;

          if (!day) return <div key={i} className="bg-transparent" />;

          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvents = events.filter((e: UnifiedEvent) => e.date.toDateString() === day.toDateString());
          
          // Limite d'affichage : 3 en normal, 2 en compact
          const MAX_VISIBLE = compact ? 2 : 3; 
          const hiddenCount = dayEvents.length - MAX_VISIBLE;

          return (
            <div 
              key={i} 
              className={cn(
                "relative p-1.5 rounded-xl border bg-card hover:border-primary/50 transition-all flex flex-col group overflow-hidden cursor-pointer",
                isToday ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60"
              )}
              onClick={() => onSelectDay(day)} // Ouvre le détail complet du jour
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                  isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground group-hover:bg-muted"
                )}>
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && <span className="text-[10px] text-muted-foreground font-medium">{dayEvents.length}</span>}
              </div>
              
              <div className="flex-1 flex flex-col gap-1 w-full">
                {dayEvents.slice(0, MAX_VISIBLE).map((event: UnifiedEvent) => (
                  <button
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                    className="flex items-center w-full gap-1.5 px-1.5 py-0.5 rounded-md hover:brightness-95 transition-all text-left group/evt"
                    style={{ backgroundColor: `${event.color}15`, borderLeft: `3px solid ${event.color}` }}
                  >
                    <span className="text-[10px] font-medium truncate flex-1 text-foreground/90 leading-tight">
                      {event.title}
                    </span>
                  </button>
                ))}
                
                {hiddenCount > 0 && (
                  <div className="mt-auto w-full text-[10px] font-semibold text-center py-0.5 bg-muted/50 text-muted-foreground rounded">
                    + {hiddenCount} autres...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =======================
// DIALOGUE DÉTAIL JOUR (POUR VOIR TOUS LES ÉVÉNEMENTS)
// =======================
function DayDetailsDialog({ date, events, onClose, onSelectEvent }: any) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="text-4xl font-bold text-primary">{date.getDate()}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium uppercase text-muted-foreground">
                {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
              </span>
              <span className="text-sm text-foreground">
                {date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 bg-background/50 p-4">
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Rien de prévu ce jour-là.</p>
            ) : (
              events.map((event: UnifiedEvent) => (
                <div 
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent cursor-pointer transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="mt-1 w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-0" style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                        {event.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>}
                  </div>
                  
                  {event.imageUrl && (
                    <img src={event.imageUrl} className="w-12 h-16 object-cover rounded-md shadow-sm" alt="" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t bg-background flex justify-end">
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =======================
// VUE SEMAINE
// =======================
function WeekView({ date, events, onSelectEvent }: any) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-3 h-full min-h-[400px]">
      {weekDays.map((day) => {
        const isToday = day.toDateString() === new Date().toDateString();
        const dayEvents = events.filter((e: UnifiedEvent) => e.date.toDateString() === day.toDateString());
        
        return (
          <div key={day.toISOString()} className={cn(
            "flex flex-col rounded-xl border bg-card/40 overflow-hidden",
            isToday && "ring-2 ring-primary/20 border-primary"
          )}>
            <div className={cn("text-center py-2 border-b bg-muted/30", isToday && "bg-primary/10")}>
              <div className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
              <div className={cn(
                "text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
              )}>
                {day.getDate()}
              </div>
            </div>
            
            <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto custom-scrollbar">
              {dayEvents.map((event: UnifiedEvent) => (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="w-full text-left p-2 rounded-lg bg-card border text-xs hover:border-primary/50 transition-all shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color }} />
                  <div className="pl-2 font-medium truncate text-foreground group-hover:text-primary">{event.title}</div>
                  <div className="pl-2 text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    {event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =======================
// VUE LISTE
// =======================
function ListView({ events, onSelectEvent }: any) {
  const sorted = [...events].sort((a: any, b: any) => a.date - b.date);
  
  if (sorted.length === 0) return <div className="text-center text-muted-foreground py-10 text-sm">Aucun événement à venir</div>;

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {sorted.map((event: UnifiedEvent) => (
        <div 
          key={event.id} 
          onClick={() => onSelectEvent(event)}
          className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-accent/50 cursor-pointer transition-all hover:shadow-md group"
        >
          {/* Date Box */}
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-muted/40 border shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{event.date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
            <span className="text-xl font-bold leading-none text-foreground">{event.date.getDate()}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-0" style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                {event.type}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h4 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{event.title}</h4>
            {event.description && <p className="text-xs text-muted-foreground truncate opacity-70">{event.description}</p>}
          </div>

          {/* Image */}
          {event.imageUrl && (
            <img src={event.imageUrl} alt="" className="w-12 h-16 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
          )}
        </div>
      ))}
    </div>
  );
}

// =======================
// DIALOGUES DIVERS
// =======================

function AddEventDialog({ open, onOpenChange, onSave }: any) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async () => {
    if (!title || !date) return;
    setSaving(true);
    try {
      const eventDate = new Date(date + (time ? `T${time}` : 'T00:00'));
      await createEvent({
        title,
        description: desc,
        startDate: eventDate,
        endDate: null,
        type: 'personal',
        color: DEFAULT_COLORS.personal,
        allDay: !time,
        location: null,
        url: null,
        metadata: null,
        recurring: 'none',
        notifyBefore: null,
        completed: false
      });
      onSave();
      onOpenChange(false);
      setTitle(''); setDesc(''); setDate(''); setTime('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Réunion" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Détails..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={!title || !date || saving}>
              {saving ? '...' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailsDialog({ event, onClose, onDelete }: any) {
  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
        
        {/* Header Image */}
        <div className="h-32 relative flex items-end p-4 overflow-hidden bg-muted">
          {event.imageUrl ? (
            <>
              <div className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110" style={{ backgroundImage: `url(${event.imageUrl})` }} />
              <img src={event.imageUrl} alt={event.title} className="absolute right-4 bottom-[-20px] w-20 h-28 object-cover rounded-lg shadow-xl z-20 border-2 border-background" />
            </>
          ) : (
            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: event.color }} />
          )}
          
          <div className="flex flex-col z-10 w-3/4">
            <Badge variant="secondary" className="w-fit mb-1.5 uppercase tracking-wide text-[10px]" style={{ color: event.color, backgroundColor: 'white' }}>
              {event.type}
            </Badge>
            <h2 className="text-lg font-bold leading-tight line-clamp-2">{event.title}</h2>
          </div>
        </div>

        <div className="p-5 pt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
            <Clock className="h-4 w-4 text-primary" />
            <span className="capitalize font-medium text-foreground">
              {event.date.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {event.description ? (
            <div className="text-sm leading-relaxed text-foreground/80">
              {event.description}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground/50 italic flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Pas de description
            </div>
          )}

          {event.metadata?.rating && (
            <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm">
              <Star className="h-4 w-4 fill-current" /> {event.metadata.rating}/10
            </div>
          )}

          <div className="pt-4 flex gap-2 border-t mt-4">
            {event.externalUrl && (
              <Button asChild variant="default" className="flex-1">
                <a href={event.externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Voir détails
                </a>
              </Button>
            )}
            {event.type === 'personal' && (
              <Button variant="destructive" className="flex-1" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}