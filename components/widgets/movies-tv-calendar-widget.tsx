'use client';

import { useState, useEffect } from 'react';
import { Calendar, Film, Tv, TrendingUp, Clock, Star, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getIntegrations } from '@/lib/actions/integrations';
import {
  getUpcomingMovies,
  getTrendingMovies,
  getTVAiringToday,
  getTVOnTheAir,
  getTrendingTVShows,
  type TMDbMovie,
  type TMDbTVShow,
} from '@/lib/api/tmdb';

interface MoviesAndTVCalendarWidgetProps {
  options?: {
    view?: 'movies' | 'tv' | 'both';
    timeWindow?: 'day' | 'week';
    showTrending?: boolean;
  };
}

export function MoviesAndTVCalendarWidget({ options }: MoviesAndTVCalendarWidgetProps) {
  const [upcomingMovies, setUpcomingMovies] = useState<TMDbMovie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDbMovie[]>([]);
  const [tvAiringToday, setTvAiringToday] = useState<TMDbTVShow[]>([]);
  const [tvOnTheAir, setTvOnTheAir] = useState<TMDbTVShow[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDbTVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>(
    options?.view === 'tv' ? 'tv' : 'movies'
  );
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>(options?.timeWindow || 'day');
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
      const radarr = integrationsData?.find((i: any) => i.type === 'radarr');
      const sonarr = integrationsData?.find((i: any) => i.type === 'sonarr');
      setRadarrIntegration(radarr || null);
      setSonarrIntegration(sonarr || null);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const handleAddToRadarr = async (movie: TMDbMovie) => {
    if (!radarrIntegration) {
      alert('Radarr not configured');
      return;
    }

    setAddingToRadarr((prev) => ({ ...prev, [movie.id]: true }));

    try {
      const res = await fetch('/api/integrations/radarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: radarrIntegration.id,
          tmdbId: movie.id,
          title: movie.title || (movie as any).name,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(`Error: ${json.error || 'Failed to add to Radarr'}`);
      } else {
        alert(`${movie.title || (movie as any).name} added to Radarr!`);
      }
    } catch (error) {
      console.error('Error adding to Radarr:', error);
      alert('Failed to add to Radarr');
    } finally {
      setAddingToRadarr((prev) => ({ ...prev, [movie.id]: false }));
    }
  };

  const handleAddToSonarr = async (tvShow: TMDbTVShow) => {
    if (!sonarrIntegration) {
      alert('Sonarr not configured');
      return;
    }

    setAddingToSonarr((prev) => ({ ...prev, [tvShow.id]: true }));

    try {
      const res = await fetch('/api/integrations/sonarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: sonarrIntegration.id,
          tvdbId: tvShow.id,
          title: tvShow.name,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(`Error: ${json.error || 'Failed to add to Sonarr'}`);
      } else {
        alert(`${tvShow.name} added to Sonarr!`);
      }
    } catch (error) {
      console.error('Error adding to Sonarr:', error);
      alert('Failed to add to Sonarr');
    } finally {
      setAddingToSonarr((prev) => ({ ...prev, [tvShow.id]: false }));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [upcomingMoviesData, trendingMoviesData, tvTodayData, tvOnAirData, trendingTVData] =
        await Promise.all([
          getUpcomingMovies(1),
          getTrendingMovies(timeWindow),
          getTVAiringToday(),
          getTVOnTheAir(),
          getTrendingTVShows(timeWindow),
        ]);

      setUpcomingMovies(upcomingMoviesData.slice(0, 10));
      setTrendingMovies(trendingMoviesData.slice(0, 10));
      setTvAiringToday(tvTodayData.slice(0, 10));
      setTvOnTheAir(tvOnAirData.slice(0, 10));
      setTrendingTV(trendingTVData.slice(0, 10));
    } catch (error) {
      console.error('Error loading TMDb data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const showMovies = options?.view !== 'tv';
  const showTV = options?.view !== 'movies';

  return (
    <div className="space-y-4">
      {/* En-tête avec filtre temporel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Films & Séries TV</h3>
        </div>
        <Select value={timeWindow} onValueChange={(v: 'day' | 'week') => setTimeWindow(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Onglets Films / Séries */}
      {options?.view === 'both' || !options?.view ? (
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="w-full">
            <TabsTrigger value="movies" className="flex-1">
              <Film className="h-4 w-4 mr-2" />
              Films
            </TabsTrigger>
            <TabsTrigger value="tv" className="flex-1">
              <Tv className="h-4 w-4 mr-2" />
              Séries TV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movies" className="space-y-4 mt-4">
            <MoviesSection
              upcomingMovies={upcomingMovies}
              trendingMovies={trendingMovies}
              showTrending={options?.showTrending !== false}
              radarrIntegration={radarrIntegration}
              addingToRadarr={addingToRadarr}
              onAddToRadarr={handleAddToRadarr}
            />
          </TabsContent>

          <TabsContent value="tv" className="space-y-4 mt-4">
            <TVSection
              tvAiringToday={tvAiringToday}
              tvOnTheAir={tvOnTheAir}
              trendingTV={trendingTV}
              showTrending={options?.showTrending !== false}
              sonarrIntegration={sonarrIntegration}
              addingToSonarr={addingToSonarr}
              onAddToSonarr={handleAddToSonarr}
            />
          </TabsContent>
        </Tabs>
      ) : showMovies ? (
        <MoviesSection
          upcomingMovies={upcomingMovies}
          trendingMovies={trendingMovies}
          showTrending={options?.showTrending !== false}
          radarrIntegration={radarrIntegration}
          addingToRadarr={addingToRadarr}
          onAddToRadarr={handleAddToRadarr}
        />
      ) : (
        <TVSection
          tvAiringToday={tvAiringToday}
          tvOnTheAir={tvOnTheAir}
          trendingTV={trendingTV}
          showTrending={options?.showTrending !== false}
          sonarrIntegration={sonarrIntegration}
          addingToSonarr={addingToSonarr}
          onAddToSonarr={handleAddToSonarr}
        />
      )}
    </div>
  );
}

/**
 * Section Films
 */
function MoviesSection({
  upcomingMovies,
  trendingMovies,
  showTrending,
  radarrIntegration,
  addingToRadarr,
  onAddToRadarr,
}: {
  upcomingMovies: TMDbMovie[];
  trendingMovies: TMDbMovie[];
  showTrending: boolean;
  radarrIntegration?: any;
  addingToRadarr?: Record<string, boolean>;
  onAddToRadarr?: (movie: TMDbMovie) => void;
}) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6 pr-4">
        {/* Films à venir */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Prochaines sorties
          </h4>
          <div className="space-y-3">
            {upcomingMovies.map((movie, index) => (
              <MovieCard 
                key={`upcoming-${movie.id}-${index}`} 
                movie={movie}
                radarrIntegration={radarrIntegration}
                isAdding={addingToRadarr?.[movie.id]}
                onAddToRadarr={onAddToRadarr}
              />
            ))}
          </div>
        </div>

        {/* Films tendance */}
        {showTrending && trendingMovies.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Tendances
            </h4>
            <div className="space-y-3">
              {trendingMovies.map((movie, index) => (
                <MovieCard 
                  key={`trending-movie-${movie.id}-${index}`} 
                  movie={movie}
                  radarrIntegration={radarrIntegration}
                  isAdding={addingToRadarr?.[movie.id]}
                  onAddToRadarr={onAddToRadarr}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Section Séries TV
 */
function TVSection({
  tvAiringToday,
  tvOnTheAir,
  trendingTV,
  showTrending,
  sonarrIntegration,
  addingToSonarr,
  onAddToSonarr,
}: {
  tvAiringToday: TMDbTVShow[];
  tvOnTheAir: TMDbTVShow[];
  trendingTV: TMDbTVShow[];
  showTrending: boolean;
  sonarrIntegration?: any;
  addingToSonarr?: Record<string, boolean>;
  onAddToSonarr?: (show: TMDbTVShow) => void;
}) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6 pr-4">
        {/* Diffusion aujourd'hui */}
        {tvAiringToday.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Diffusion aujourd'hui
            </h4>
            <div className="space-y-3">
              {tvAiringToday.map((show, index) => (
                <TVShowCard 
                  key={`airing-${show.id}-${index}`} 
                  show={show}
                  sonarrIntegration={sonarrIntegration}
                  isAdding={addingToSonarr?.[show.id]}
                  onAddToSonarr={onAddToSonarr}
                />
              ))}
            </div>
          </div>
        )}

        {/* En cours de diffusion */}
        {tvOnTheAir.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Tv className="h-4 w-4 text-green-500" />
              En cours de diffusion
            </h4>
            <div className="space-y-3">
              {tvOnTheAir.map((show, index) => (
                <TVShowCard 
                  key={`onair-${show.id}-${index}`} 
                  show={show}
                  sonarrIntegration={sonarrIntegration}
                  isAdding={addingToSonarr?.[show.id]}
                  onAddToSonarr={onAddToSonarr}
                />
              ))}
            </div>
          </div>
        )}

        {/* Séries tendance */}
        {showTrending && trendingTV.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Tendances
            </h4>
            <div className="space-y-3">
              {trendingTV.map((show, index) => (
                <TVShowCard 
                  key={`trending-tv-${show.id}-${index}`} 
                  show={show}
                  sonarrIntegration={sonarrIntegration}
                  isAdding={addingToSonarr?.[show.id]}
                  onAddToSonarr={onAddToSonarr}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Carte Film
 */
function MovieCard({ 
  movie, 
  radarrIntegration, 
  isAdding, 
  onAddToRadarr 
}: { 
  movie: TMDbMovie;
  radarrIntegration?: any;
  isAdding?: boolean;
  onAddToRadarr?: (movie: TMDbMovie) => void;
}) {
  const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;

  return (
    <div className="flex gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors group">
      <a
        href={tmdbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 flex-1 hover:text-primary transition-colors"
      >
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-16 h-24 object-cover rounded shadow-sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <h5 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {movie.title}
          </h5>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {movie.releaseDate}
            </Badge>
            {movie.voteAverage && movie.voteAverage > 0 && (
              <span className="text-xs text-yellow-500 flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {movie.voteAverage.toFixed(1)}
              </span>
            )}
          </div>
          {movie.genres && movie.genres.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {movie.genres.join(', ')}
            </p>
          )}
        </div>
      </a>
      {radarrIntegration && onAddToRadarr && (
        <div className="flex items-center">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              onAddToRadarr(movie);
            }}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Carte Série TV
 */
function TVShowCard({ 
  show, 
  sonarrIntegration, 
  isAdding, 
  onAddToSonarr 
}: { 
  show: TMDbTVShow;
  sonarrIntegration?: any;
  isAdding?: boolean;
  onAddToSonarr?: (show: TMDbTVShow) => void;
}) {
  const tmdbUrl = `https://www.themoviedb.org/tv/${show.id}`;

  return (
    <div className="flex gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors group">
      <a
        href={tmdbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 flex-1 hover:text-primary transition-colors"
      >
        {show.posterUrl && (
          <img
            src={show.posterUrl}
            alt={show.name}
            className="w-16 h-24 object-cover rounded shadow-sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <h5 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {show.name}
          </h5>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {show.firstAirDate}
            </Badge>
            {show.voteAverage && show.voteAverage > 0 && (
              <span className="text-xs text-yellow-500 flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {show.voteAverage.toFixed(1)}
              </span>
            )}
          </div>
          {show.genres && show.genres.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {show.genres.join(', ')}
            </p>
          )}
        </div>
      </a>
      {sonarrIntegration && onAddToSonarr && (
        <div className="flex items-center">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              onAddToSonarr(show);
            }}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
