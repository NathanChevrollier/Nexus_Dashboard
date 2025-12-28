'use client';

import { useState, useEffect } from 'react';
import { useAlert } from '@/components/ui/confirm-provider';
import { 
  Calendar, 
  Film, 
  Tv, 
  TrendingUp, 
  Clock, 
  Star, 
  Plus, 
  Loader2, 
  RefreshCw,
  MoreVertical,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  getUpcomingMovies,
  getTrendingMovies,
  getTVAiringToday,
  getTVOnTheAir,
  getTrendingTVShows,
  type TMDbMovie,
  type TMDbTVShow,
} from '@/lib/api/tmdb';
import { getIntegrations } from '@/lib/actions/integrations';

interface MoviesAndTVCalendarWidgetProps {
  options?: {
    view?: 'movies' | 'tv' | 'both';
    timeWindow?: 'day' | 'week';
  };
}

export function MoviesAndTVCalendarWidget({ options }: MoviesAndTVCalendarWidgetProps) {
  const alert = useAlert();
  
  // Data State
  const [upcomingMovies, setUpcomingMovies] = useState<TMDbMovie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDbMovie[]>([]);
  const [tvAiringToday, setTvAiringToday] = useState<TMDbTVShow[]>([]);
  const [tvOnTheAir, setTvOnTheAir] = useState<TMDbTVShow[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDbTVShow[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>(options?.view === 'tv' ? 'tv' : 'movies');
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>(options?.timeWindow || 'day');
  
  // Sub-filter State (Equivalent aux jours dans le widget Anime)
  const [movieFilter, setMovieFilter] = useState<'upcoming' | 'trending'>('upcoming');
  const [tvFilter, setTvFilter] = useState<'airing' | 'on_air' | 'trending'>('airing');

  // Integrations State
  const [radarrIntegration, setRadarrIntegration] = useState<any>(null);
  const [sonarrIntegration, setSonarrIntegration] = useState<any>(null);
  const [addingToRadarr, setAddingToRadarr] = useState<Record<string, boolean>>({});
  const [addingToSonarr, setAddingToSonarr] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
    loadIntegrations();
  }, [timeWindow]);

  const loadIntegrations = async () => {
    try {
      const integrationsData = await getIntegrations();
      setRadarrIntegration(integrationsData?.find((i: any) => i.type === 'radarr') || null);
      setSonarrIntegration(integrationsData?.find((i: any) => i.type === 'sonarr') || null);
    } catch (error) {
      console.error('Failed to load integrations', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // On charge tout d'un coup pour éviter les chargements intempestifs au changement de filtre
      const [upcomingM, trendingM, tvToday, tvOnAir, trendingT] = await Promise.all([
        getUpcomingMovies(1),
        getTrendingMovies(timeWindow),
        getTVAiringToday(),
        getTVOnTheAir(),
        getTrendingTVShows(timeWindow),
      ]);

      setUpcomingMovies(upcomingM);
      setTrendingMovies(trendingM);
      setTvAiringToday(tvToday);
      setTvOnTheAir(tvOnAir);
      setTrendingTV(trendingT);
    } catch (error) {
      console.error('Error loading TMDb data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires d'ajout (Radarr/Sonarr)
  const handleAddToRadarr = async (e: React.MouseEvent, movie: TMDbMovie) => {
    e.stopPropagation();
    if (!radarrIntegration) return;
    setAddingToRadarr((prev) => ({ ...prev, [movie.id]: true }));
    try {
      await fetch('/api/integrations/radarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: radarrIntegration.id,
          tmdbId: movie.id,
          title: movie.title,
        }),
      });
      // Toast success ici si nécessaire
    } catch (error) {
      console.error('Radarr error', error);
    } finally {
      setTimeout(() => setAddingToRadarr((prev) => ({ ...prev, [movie.id]: false })), 500);
    }
  };

  const handleAddToSonarr = async (e: React.MouseEvent, show: TMDbTVShow) => {
    e.stopPropagation();
    if (!sonarrIntegration) return;
    setAddingToSonarr((prev) => ({ ...prev, [show.id]: true }));
    try {
      await fetch('/api/integrations/sonarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: sonarrIntegration.id,
          tvdbId: show.id,
          title: show.name,
        }),
      });
    } catch (error) {
      console.error('Sonarr error', error);
    } finally {
      setTimeout(() => setAddingToSonarr((prev) => ({ ...prev, [show.id]: false })), 500);
    }
  };

  // Sélection des données à afficher selon les filtres
  const activeMoviesList = movieFilter === 'upcoming' ? upcomingMovies : trendingMovies;
  const activeTVList = tvFilter === 'airing' ? tvAiringToday : (tvFilter === 'on_air' ? tvOnTheAir : trendingTV);

  if (loading) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 shadow-sm">
      
      {/* 1. HEADER FIXE */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0 h-14">
        <div className="flex items-center gap-2">
          {activeTab === 'movies' ? <Film className="h-4 w-4 text-primary" /> : <Tv className="h-4 w-4 text-primary" />}
          <h3 className="font-semibold text-sm">Découverte</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Le sélecteur de temps n'est pertinent que pour les tendances */}
          {((activeTab === 'movies' && movieFilter === 'trending') || (activeTab === 'tv' && tvFilter === 'trending')) && (
            <Select value={timeWindow} onValueChange={(v: 'day' | 'week') => setTimeWindow(v)}>
              <SelectTrigger className="h-7 text-xs w-[100px] bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button onClick={loadData} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. MAIN TABS (Switch Movies / TV) */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3 pb-1 shrink-0">
            <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="movies" className="text-xs">Films</TabsTrigger>
            <TabsTrigger value="tv" className="text-xs">Séries TV</TabsTrigger>
          </TabsList>
        </div>

        {/* --- MOVIES CONTENT --- */}
        <TabsContent value="movies" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
          {/* Sub-Filters (Puces) */}
          <div className="px-4 py-2 border-b shrink-0 bg-background/95 z-10">
            <div className="flex gap-2">
              <FilterChip 
                label="À venir" 
                icon={Calendar} 
                isActive={movieFilter === 'upcoming'} 
                onClick={() => setMovieFilter('upcoming')} 
              />
              <FilterChip 
                label="Tendances" 
                icon={TrendingUp} 
                isActive={movieFilter === 'trending'} 
                onClick={() => setMovieFilter('trending')} 
              />
            </div>
          </div>

          <ScrollArea className="flex-1 w-full h-full">
            <div className="p-4 space-y-3 pb-20">
              {activeMoviesList.length === 0 ? <EmptyState /> : activeMoviesList.map((movie) => (
                <MediaListItem 
                  key={movie.id} 
                  media={movie} 
                  type="movie" 
                  integration={radarrIntegration}
                  isAdding={addingToRadarr?.[movie.id]}
                  onAdd={handleAddToRadarr}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* --- TV CONTENT --- */}
        <TabsContent value="tv" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
           {/* Sub-Filters (Puces) */}
           <div className="px-4 py-2 border-b shrink-0 bg-background/95 z-10">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 w-max pr-4">
                <FilterChip 
                  label="Diffusion aujourd'hui" 
                  icon={Clock} 
                  isActive={tvFilter === 'airing'} 
                  onClick={() => setTvFilter('airing')} 
                />
                <FilterChip 
                  label="En cours" 
                  icon={Tv} 
                  isActive={tvFilter === 'on_air'} 
                  onClick={() => setTvFilter('on_air')} 
                />
                 <FilterChip 
                  label="Tendances" 
                  icon={TrendingUp} 
                  isActive={tvFilter === 'trending'} 
                  onClick={() => setTvFilter('trending')} 
                />
              </div>
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1 w-full h-full">
            <div className="p-4 space-y-3 pb-20">
              {activeTVList.length === 0 ? <EmptyState /> : activeTVList.map((show) => (
                <MediaListItem 
                  key={show.id} 
                  media={show} 
                  type="tv"
                  integration={sonarrIntegration}
                  isAdding={addingToSonarr?.[show.id]}
                  onAdd={handleAddToSonarr}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

      </Tabs>
    </Card>
  );
}

// --- SOUS-COMPOSANTS ---

function FilterChip({ label, icon: Icon, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border",
        isActive 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-accent hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
      <Film className="h-10 w-10 mb-2 opacity-20" />
      <p className="text-sm">Aucun média trouvé</p>
    </div>
  );
}

function MediaListItem({ media, type, integration, isAdding, onAdd }: any) {
  const title = media.title || media.name;
  // Use raw TMDb fields for computing year; formatted helpers are available in media.releaseDate / media.firstAirDate
  const rawDate = media.release_date || media.first_air_date || null;
  const formattedDate = media.releaseDate || media.firstAirDate || '';
  const year = rawDate ? String(new Date(rawDate).getFullYear()) : '';
  const tmdbUrl = `https://www.themoviedb.org/${type}/${media.id}`;

  return (
    <div
      className="group flex gap-4 p-3 rounded-xl border bg-card/50 hover:bg-accent/50 transition-all cursor-pointer"
      onClick={() => window.open(tmdbUrl, '_blank')}
    >
      {/* Poster */}
      <div className="relative shrink-0 w-24 h-36 rounded-md overflow-hidden bg-muted shadow-sm">
        {media.posterUrl ? (
          <Image 
            src={media.posterUrl} 
            alt={title} 
            fill 
            sizes="(max-width: 640px) 96px, 128px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-secondary text-muted-foreground">
            <Film className="h-5 w-5 opacity-50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex justify-between items-start gap-2">
             <h4 className="font-medium text-base leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
              {title}
            </h4>
            
            {/* Add Button (Radarr/Sonarr) */}
            {integration && (
               <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => onAdd(e, media)}
                disabled={isAdding}
              >
                {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
            {year && (
              <Badge variant="outline" className="h-5 px-2 text-[10px] font-normal border-border/60">
                {year}
              </Badge>
            )}

            {media.voteAverage > 0 && (
              <span className="flex items-center font-semibold text-yellow-500">
                <Star className="h-4 w-4 fill-current mr-2" />
                {media.voteAverage.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Info (Date precise) */}
          <div className="mt-2">
             <span className="text-sm text-muted-foreground/80">
               {rawDate ? new Date(rawDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date inconnue'}
             </span>
          </div>
      </div>
    </div>
  );
}