'use client';

import { useState, useEffect } from 'react';
import { useAlert } from '@/components/ui/confirm-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getAiringThisWeek,
  getReleasingManga,
  groupByDay,
  formatTimeUntilAiring,
  getDayColor,
  type AnimeSchedule,
  type MangaRelease,
} from '@/lib/api/anilist';
import { getIntegrations } from '@/lib/actions/integrations';
import {
  Calendar,
  Clock,
  TrendingUp,
  ExternalLink,
  Tv,
  BookOpen,
  RefreshCw,
  Star,
  Play,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface AnimeCalendarWidgetProps {
  width?: number;
  height?: number;
}

export function AnimeCalendarWidget({ width = 2, height = 2 }: AnimeCalendarWidgetProps) {
  const [animeSchedule, setAnimeSchedule] = useState<AnimeSchedule[]>([]);
  const [mangaReleases, setMangaReleases] = useState<MangaRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'anime' | 'manga'>('anime');
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [sonarrIntegration, setSonarrIntegration] = useState<any>(null);
  const [addingToSonarr, setAddingToSonarr] = useState<Record<string, boolean>>({});

  const isCompact = width <= 2 && height <= 2;
  const isLarge = width >= 3 || height >= 3;

  useEffect(() => {
    loadData();
    loadSonarrIntegration();
  }, []);

  // Recharger quand on change de jour ou onglet (rafraîchissement automatique demandé)
  useEffect(() => {
    loadData();
  }, [selectedDay, activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [animeData, mangaData] = await Promise.all([
        getAiringThisWeek(),
        getReleasingManga(1, 12),
      ]);

      setAnimeSchedule(animeData);
      setMangaReleases(mangaData);
    } catch (err) {
      setError('Failed to load anime/manga data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSonarrIntegration() {
    try {
      const integrations = await getIntegrations();
      const sonarr = integrations?.find((i: any) => i.type === 'sonarr');
      setSonarrIntegration(sonarr || null);
    } catch (error) {
      console.error('Failed to load Sonarr integration:', error);
    }
  }

  async function handleAddToSonarr(anime: AnimeSchedule) {
    if (!sonarrIntegration) {
      await alert('Sonarr not configured');
      return;
    }

    setAddingToSonarr((prev) => ({ ...prev, [anime.id]: true }));

    try {
      const res = await fetch('/api/integrations/sonarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            integrationId: sonarrIntegration.id,
            tvdbId: (anime as any).tvdbId,
            title: anime.title,
          }),
      });

      const json = await res.json();

      if (!res.ok) {
        await alert(`Error: ${json.error || 'Failed to add to Sonarr'}`);
      } else {
        await alert(`${anime.title} added to Sonarr!`);
      }
    } catch (error) {
      console.error('Error adding to Sonarr:', error);
      await alert('Failed to add to Sonarr');
    } finally {
      setAddingToSonarr((prev) => ({ ...prev, [anime.id]: false }));
    }
  }

  const groupedByDay = groupByDay(animeSchedule);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Filter by selected day
  const filteredAnime =
    selectedDay === 'All'
      ? animeSchedule
      : groupedByDay[selectedDay] || [];

  // Sort by airing time
  const sortedAnime = [...filteredAnime].sort((a, b) => {
    const timeA = a.nextAiringEpisode?.airingAt || 0;
    const timeB = b.nextAiringEpisode?.airingAt || 0;
    return timeA - timeB;
  });

  if (loading) {
    return (
      <Card className="w-full h-full p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading schedule...</p>
        </div>
      </Card>
    );
  }

  // Don't completely replace the UI on error — show a banner so user can still switch tabs
  // and retry without being forced into a single-action view.

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Anime Calendar</h3>
        </div>
        <Button onClick={loadData} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-sm text-red-700 flex items-center justify-between gap-4">
          <div>{error}</div>
          <div className="flex-shrink-0">
            <Button size="sm" variant="outline" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="anime" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            Anime
          </TabsTrigger>
          <TabsTrigger value="manga" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manga
          </TabsTrigger>
        </TabsList>

        {/* Anime Tab */}
        <TabsContent value="anime" className="flex-1 flex flex-col px-4 pb-4 mt-2">
          {/* Day Filter */}
          {isLarge && (
            <ScrollArea className="mb-3">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={selectedDay === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay('All')}
                >
                  All
                </Button>
                {days.map((day) => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDay(day)}
                    className={selectedDay === day ? '' : getDayColor(day)}
                  >
                    {isCompact ? day.slice(0, 3) : day}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Anime List */}
          <ScrollArea className="flex-1 min-h-0 border rounded-md overflow-auto">
            <div className="space-y-3 pr-4">
              {sortedAnime.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No anime airing {selectedDay === 'All' ? 'this week' : `on ${selectedDay}`}</p>
                </div>
              ) : (
                sortedAnime.map((anime, idx) => (
                  <AnimeCard 
                    key={`${anime.id}-${anime.nextAiringEpisode?.airingAt ?? idx}`} 
                    anime={anime} 
                    isCompact={isCompact}
                    sonarrIntegration={sonarrIntegration}
                    isAdding={addingToSonarr?.[anime.id]}
                    onAddToSonarr={handleAddToSonarr}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Manga Tab */}
        <TabsContent value="manga" className="flex-1 flex flex-col px-4 pb-4 mt-2">
          <ScrollArea className="flex-1 min-h-0 border rounded-md">
            <div className="space-y-3 pr-4">
              {mangaReleases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No manga releases</p>
                </div>
              ) : (
                mangaReleases.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} isCompact={isCompact} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function AnimeCard({ 
  anime, 
  isCompact,
  sonarrIntegration,
  isAdding,
  onAddToSonarr,
}: { 
  anime: AnimeSchedule; 
  isCompact: boolean;
  sonarrIntegration?: any;
  isAdding?: boolean;
  onAddToSonarr?: (anime: AnimeSchedule) => void;
}) {
  const airingDate = anime.nextAiringEpisode
    ? new Date(anime.nextAiringEpisode.airingAt * 1000)
    : null;

  const dayName = airingDate
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][airingDate.getDay()]
    : null;

  return (
    <div
      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group"
      onClick={() => window.open(anime.siteUrl, '_blank')}
    >
      {/* Cover Image */}
      {!isCompact && (
        <div className="relative shrink-0">
          <img
            src={anime.coverImage.medium}
            alt={anime.title.romaji}
            className="w-16 h-24 object-cover rounded"
            style={{
              backgroundColor: anime.coverImage.color || 'transparent',
            }}
          />
          {anime.nextAiringEpisode && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5"
            >
              Ep {anime.nextAiringEpisode.episode}
            </Badge>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {anime.title.english || anime.title.romaji}
          </h4>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Airing Info */}
        {anime.nextAiringEpisode && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring)}
            </Badge>
            {dayName && (
              <Badge variant="outline" className={`text-xs ${getDayColor(dayName)}`}>
                {dayName}
              </Badge>
            )}
            {airingDate && !isCompact && (
              <span className="text-xs text-muted-foreground">
                {airingDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        )}

        {/* Genres & Score */}
        {!isCompact && (
          <div className="flex items-center gap-2 flex-wrap">
            {anime.averageScore && (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <Star className="h-3 w-3 fill-current" />
                {anime.averageScore / 10}/10
              </div>
            )}
            {anime.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {!isCompact && sonarrIntegration && (
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSonarr?.(anime);
              }}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Sonarr
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MangaCard({ manga, isCompact }: { manga: MangaRelease; isCompact: boolean }) {
  return (
    <div
      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group"
      onClick={() => window.open(manga.siteUrl, '_blank')}
    >
      {/* Cover Image */}
      {!isCompact && (
        <div className="relative shrink-0">
          <img
            src={manga.coverImage.medium}
            alt={manga.title.romaji}
            className="w-16 h-24 object-cover rounded"
            style={{
              backgroundColor: manga.coverImage.color || 'transparent',
            }}
          />
          <Badge
            variant="secondary"
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs px-1.5 py-0.5"
          >
            {manga.format}
          </Badge>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {manga.title.english || manga.title.romaji}
          </h4>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" />
            {manga.status === 'RELEASING' ? 'Ongoing' : manga.status}
          </Badge>
          {manga.chapters && (
            <span className="text-xs text-muted-foreground">
              {manga.chapters} chapters
            </span>
          )}
        </div>

        {/* Genres & Score */}
        {!isCompact && (
          <div className="flex items-center gap-2 flex-wrap">
            {manga.averageScore && (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <Star className="h-3 w-3 fill-current" />
                {manga.averageScore / 10}/10
              </div>
            )}
            {manga.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
