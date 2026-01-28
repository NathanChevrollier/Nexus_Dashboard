'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getAiringThisWeek,
  formatTimeUntilAiring,
  type AnimeSchedule,
} from '@/lib/api/anilist';
import { getUserAnimeSchedule, updateLibraryItem } from '@/lib/actions/library';
import {
  Calendar,
  Clock,
  Tv,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddLibraryItemDialog } from '@/components/dashboard/library/add-item-dialog';

interface AnimeCalendarWidgetProps {
  width?: number;
  height?: number;
}

export function AnimeCalendarWidget({ width = 2, height = 2 }: AnimeCalendarWidgetProps) {
  const [userSchedule, setUserSchedule] = useState<any[]>([]);
  const [globalSchedule, setGlobalSchedule] = useState<AnimeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-list' | 'global'>('my-list');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAnimeToAdd, setSelectedAnimeToAdd] = useState<any>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const isCompact = width <= 2 && height <= 2;

  // Charger et persister l'onglet actif
  useEffect(() => {
    const savedTab = localStorage.getItem('anime-widget-active-tab');
    if (savedTab === 'my-list' || savedTab === 'global') {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('anime-widget-active-tab', activeTab);
  }, [activeTab]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [userScheduleData, globalScheduleData] = await Promise.all([
        getUserAnimeSchedule(),
        getAiringThisWeek(),
      ]);
      setUserSchedule(userScheduleData);
      setGlobalSchedule(globalScheduleData);
    } catch (error) {
      console.error('Error loading anime data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCheckEpisode = async (itemId: string, currentProgress: number) => {
    setUpdatingIds(prev => new Set(prev).add(itemId));
    try {
      await updateLibraryItem(itemId, {
        currentProgress: currentProgress + 1,
      });
      // Recharger les données
      const updated = await getUserAnimeSchedule();
      setUserSchedule(updated);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleAddFromGlobal = (anime: AnimeSchedule) => {
    setSelectedAnimeToAdd({
      title: anime.title.english || anime.title.romaji,
      type: 'anime',
      status: 'reading',
      currentProgress: 0,
      totalProgress: anime.episodes?.toString() || '',
      coverUrl: anime.coverImage.large,
      anilistId: anime.id,
    });
    setAddDialogOpen(true);
  };

  const handleAddSuccess = async () => {
    setAddDialogOpen(false);
    setSelectedAnimeToAdd(null);
    await loadData();
  };

  if (loading) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0 h-14">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Hub de Sorties Anime</h3>
        </div>
        <Button 
          onClick={loadData} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Tv className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1 h-full min-h-0">
        
        {/* Tab List */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="my-list" className="text-xs">Ma Liste ({userSchedule.length})</TabsTrigger>
            <TabsTrigger value="global" className="text-xs">Global ({globalSchedule.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Ma Liste */}
        <TabsContent value="my-list" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
          {userSchedule.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 p-4">
              <Tv className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm text-center">Aucun anime programmé</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Ajoute des animes à ta liste pour voir ton planning</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 w-full h-full">
              <div className={cn(
                "p-4 pb-20",
                isCompact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 lg:grid-cols-2 gap-3"
              )}>
                {userSchedule.map((item) => (
                  <AnimeScheduleCard
                    key={item.id}
                    item={item}
                    isCompact={isCompact}
                    isUpdating={updatingIds.has(item.id)}
                    onCheckEpisode={() => handleCheckEpisode(item.id, item.currentProgress)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Tab: Global */}
        <TabsContent value="global" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
          {globalSchedule.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 p-4">
              <Tv className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Aucun anime en diffusion cette semaine</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 w-full h-full">
              <div className={cn(
                "p-4 pb-20",
                isCompact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 lg:grid-cols-2 gap-3"
              )}>
                {globalSchedule.map((anime) => (
                  <GlobalAnimeCard
                    key={anime.id}
                    anime={anime}
                    isCompact={isCompact}
                    onAdd={() => handleAddFromGlobal(anime)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <AddLibraryItemDialog 
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
        initialData={selectedAnimeToAdd}
      />
    </Card>
  );
}

/**
 * Carte pour afficher un anime de la liste personnalisée
 */
function AnimeScheduleCard({ 
  item, 
  isCompact, 
  isUpdating, 
  onCheckEpisode 
}: any) {
  const timeUntil = item.timeUntilAiring || 0;
  const nextEp = item.nextEpisode;
  
  // Formater le temps restant
  let timeLabel = '';
  if (timeUntil <= 0) {
    timeLabel = 'Sorti';
  } else if (timeUntil < 3600) {
    timeLabel = `Dans ${Math.floor(timeUntil / 60)}m`;
  } else if (timeUntil < 86400) {
    timeLabel = `Dans ${Math.floor(timeUntil / 3600)}h`;
  } else {
    timeLabel = `Dans ${Math.floor(timeUntil / 86400)}j`;
  }

  return (
    <div className="group relative flex flex-col gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-all hover:shadow-sm hover:border-primary/20 overflow-hidden">
      {/* Cover Background */}
      <div className="absolute inset-0 -z-10 opacity-10 group-hover:opacity-20 transition-opacity">
        {item.coverUrl && (
          <img 
            src={item.coverUrl} 
            alt={item.title}
            className="w-full h-full object-cover blur-sm"
            loading="lazy"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex gap-3">
        {/* Cover Thumbnail */}
        {item.coverUrl && (
          <div className="relative shrink-0 w-[60px] h-[90px] rounded-md overflow-hidden bg-muted border border-border/50">
            <img 
              src={item.coverUrl} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm line-clamp-2 text-foreground/90">
              {item.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {item.status === 'reading' ? 'En cours' : item.status === 'plan_to_read' ? 'Planifié' : 'Terminé'}
            </p>
          </div>

          {/* Episode Info */}
          {nextEp && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="h-5 px-2 text-[10px] font-normal bg-secondary/50">
                Ep. {nextEp.episode}
              </Badge>
              <Badge variant="outline" className={cn(
                "h-5 px-2 text-[10px] font-normal",
                timeUntil <= 0 ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-blue-500/10 text-blue-500 border-blue-500/30"
              )}>
                <Clock className="w-2.5 h-2.5 mr-1" />
                {timeLabel}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={onCheckEpisode}
        disabled={isUpdating}
        variant="outline"
        size="sm"
        className="w-full h-8 gap-2 text-xs"
      >
        {isUpdating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Mise à jour...
          </>
        ) : (
          <>
            <Check className="w-3 h-3" />
            Marquer comme vu (Ep. {item.currentProgress + 1})
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Carte pour afficher un anime de l'API globale
 */
function GlobalAnimeCard({ 
  anime, 
  isCompact, 
  onAdd 
}: any) {
  const nextEp = anime.nextAiringEpisode;
  
  // Formater le temps restant
  let timeLabel = '';
  if (!nextEp) {
    timeLabel = 'Sorti';
  } else {
    const timeUntil = nextEp.timeUntilAiring || 0;
    if (timeUntil < 3600) {
      timeLabel = `Dans ${Math.floor(timeUntil / 60)}m`;
    } else if (timeUntil < 86400) {
      timeLabel = `Dans ${Math.floor(timeUntil / 3600)}h`;
    } else {
      timeLabel = `Dans ${Math.floor(timeUntil / 86400)}j`;
    }
  }

  return (
    <div className="group relative flex flex-col gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-all hover:shadow-sm hover:border-primary/20 overflow-hidden">
      {/* Cover Background */}
      <div className="absolute inset-0 -z-10 opacity-10 group-hover:opacity-20 transition-opacity">
        <img 
          src={anime.coverImage.large} 
          alt={anime.title.romaji}
          className="w-full h-full object-cover blur-sm"
          loading="lazy"
        />
      </div>

      {/* Main Content */}
      <div className="flex gap-3">
        {/* Cover Thumbnail */}
        <div className="relative shrink-0 w-[60px] h-[90px] rounded-md overflow-hidden bg-muted border border-border/50">
          <img 
            src={anime.coverImage.medium} 
            alt={anime.title.romaji}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm line-clamp-2 text-foreground/90">
              {anime.title.english || anime.title.romaji}
            </h4>
            <div className="flex gap-1 mt-1 flex-wrap">
              {anime.genres && anime.genres.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {anime.genres[0]}
                </span>
              )}
              {anime.averageScore && (
                <span className="text-[10px] text-yellow-500 font-medium">
                  ⭐ {Math.round(anime.averageScore / 10)}
                </span>
              )}
            </div>
          </div>

          {/* Episode Info */}
          {nextEp && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="h-5 px-2 text-[10px] font-normal bg-secondary/50">
                Ep. {nextEp.episode}
              </Badge>
              <Badge variant="outline" className="h-5 px-2 text-[10px] font-normal bg-blue-500/10 text-blue-500 border-blue-500/30">
                <Clock className="w-2.5 h-2.5 mr-1" />
                {timeLabel}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={onAdd}
        variant="outline"
        size="sm"
        className="w-full h-8 gap-2 text-xs"
      >
        <Plus className="w-3 h-3" />
        Ajouter à ma liste
      </Button>
    </div>
  );
}
