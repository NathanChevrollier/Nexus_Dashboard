'use client';

import { useState, useEffect } from 'react';
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
  getDayColor, // Assure-toi que cette fonction renvoie bien des classes genre "bg-red-500/10 text-red-500"
  type AnimeSchedule,
  type MangaRelease,
} from '@/lib/api/anilist';
import { getIntegrations } from '@/lib/actions/integrations';
import {
  Calendar,
  Clock,
  Tv,
  BookOpen,
  RefreshCw,
  Star,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// French day labels used across the widget
const DAY_LABELS_FR_FULL: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
};
const DAY_LABELS_FR_SHORT: Record<string, string> = {
  Monday: 'Lun',
  Tuesday: 'Mar',
  Wednesday: 'Mer',
  Thursday: 'Jeu',
  Friday: 'Ven',
  Saturday: 'Sam',
  Sunday: 'Dim',
};

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
  const getToday = () => {
    const d = new Date();
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  };
  const [selectedDay, setSelectedDay] = useState<string>(getToday());
  const [sonarrIntegration, setSonarrIntegration] = useState<any>(null);
  const [addingToSonarr, setAddingToSonarr] = useState<Record<string, boolean>>({});
  const [languageFilter, setLanguageFilter] = useState<'all' | 'vf' | 'vostfr'>('all');
  const [animeLangMap, setAnimeLangMap] = useState<Record<number, 'vf' | 'vostfr' | 'auto'>>({});

  const isCompact = width <= 2 && height <= 2;

  useEffect(() => {
    loadData();
    loadSonarrIntegration();
    // load local language map
    try {
      const raw = localStorage.getItem('animeLangMap');
      if (raw) setAnimeLangMap(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'manga') setSelectedDay('All');
  }, [activeTab]);

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
      // Detect providers for fetched anime and merge into local map
      try {
        // Load persisted map (fresh read to avoid stale closure)
        let persisted: Record<number, any> = {};
        try {
          const raw = localStorage.getItem('animeLangMap');
          if (raw) persisted = JSON.parse(raw);
        } catch (e) { persisted = {}; }

        const idsToCheck = animeData
          .map((a) => ({ id: a.id, title: a.title?.english || a.title?.romaji || '' }))
          .filter((it) => it.title && (!persisted[it.id] || persisted[it.id] === 'auto'));

        if (idsToCheck.length > 0) {
          const titleToIds: Record<string, number[]> = {};
          idsToCheck.forEach((it) => {
            const key = it.title.trim();
            if (!titleToIds[key]) titleToIds[key] = [];
            titleToIds[key].push(it.id);
          });

          const uniqueTitles = Object.keys(titleToIds);
          const batchSize = 20;
          const detectedMap: Record<number, 'vf'|'vostfr'|'unknown'> = {};

          for (let i = 0; i < uniqueTitles.length; i += batchSize) {
            const batch = uniqueTitles.slice(i, i + batchSize);
            try {
              const res = await fetch('/api/tmdb/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles: batch }),
              });
              if (!res.ok) continue;
              const data = await res.json();
              if (!data || !data.ok || !Array.isArray(data.results)) continue;

              data.results.forEach((r: any) => {
                const t = String(r.title || '').trim();
                const ids = titleToIds[t] || [];
                ids.forEach((id) => {
                  detectedMap[id] = r.result === 'vf' ? 'vf' : (r.result === 'vostfr' ? 'vostfr' : 'unknown');
                });
              });
            } catch (e) {
              // ignore batch errors and continue
            }
          }

          const nextMap = { ...(persisted || {}), ...(animeLangMap || {}) } as Record<number, any>;
          Object.keys(detectedMap).forEach((k) => { nextMap[Number(k)] = detectedMap[Number(k)]; });
          if (Object.keys(detectedMap).length > 0) {
            setAnimeLangMap(nextMap);
            try { localStorage.setItem('animeLangMap', JSON.stringify(nextMap)); } catch (e) {}
          }
        }
      } catch (e) { /* ignore provider detection errors */ }
    } catch (err) {
      setError('Failed to load data');
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

  async function handleAddToSonarr(e: React.MouseEvent, anime: AnimeSchedule) {
    e.stopPropagation();
    if (!sonarrIntegration) return;
    setAddingToSonarr((prev) => ({ ...prev, [anime.id]: true }));

    try {
      await fetch('/api/integrations/sonarr/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: sonarrIntegration.id,
          tvdbId: (anime as any).tvdbId,
          title: anime.title,
        }),
      });
    } catch (error) {
      console.error('Error adding to Sonarr:', error);
    } finally {
      setTimeout(() => {
        setAddingToSonarr((prev) => ({ ...prev, [anime.id]: false }));
      }, 500);
    }
  }

  const groupedByDay = groupByDay(animeSchedule);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let filteredAnime = selectedDay === 'All' ? animeSchedule : groupedByDay[selectedDay] || [];

  // Apply language filter using local mapping (user-provided)
  if (languageFilter !== 'all') {
    filteredAnime = filteredAnime.filter(a => {
      const tag = animeLangMap?.[a.id];
      if (!tag || tag === 'auto') return false; // if no tag, treat as not matching
      return (languageFilter === 'vf' && tag === 'vf') || (languageFilter === 'vostfr' && tag === 'vostfr');
    });
  }

  const sortedAnime = [...filteredAnime].sort((a, b) => {
    const timeA = a.nextAiringEpisode?.airingAt || 0;
    const timeB = b.nextAiringEpisode?.airingAt || 0;
    return timeA - timeB;
  });

  if (loading) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </Card>
    );
  }

  return (
    // CORRECTION LAYOUT : flex flex-col h-full est crucial ici
    <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 shadow-sm">
      
      {/* Header Fixe */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0 h-14">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Programme</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as any)}
            className="text-xs px-2 py-1 bg-background border border-border rounded"
            title="Filtrer par langue"
          >
            <option value="all">Toutes langues</option>
            <option value="vf">VF uniquement</option>
            <option value="vostfr">VOSTFR uniquement</option>
          </select>
          <Button onClick={loadData} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* CORRECTION LAYOUT : 
         Tabs doit avoir h-full et flex-col pour pousser le contenu vers le bas
      */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1 h-full min-h-0">
        
        {/* Onglets Fixes */}
        <div className="px-4 pt-3 pb-1 shrink-0">
            <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="anime" className="text-xs">Animés</TabsTrigger>
            <TabsTrigger value="manga" className="text-xs">Manga</TabsTrigger>
          </TabsList>
        </div>

        {/* CORRECTION CRITIQUE LAYOUT : 
            TabsContent est souvent un 'block' par défaut. 
            On le force en 'flex-1 flex flex-col h-full' pour qu'il prenne TOUT l'espace restant.
        */}
        <TabsContent value="anime" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
          
          {/* Filtres Jours (Fixe) */}
          <div className="px-4 py-2 border-b shrink-0 bg-background/95 z-10">
            <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
              <div className="flex w-max gap-2 pb-1 pr-4">
                <FilterChip 
                  label="Tous" 
                  isActive={selectedDay === 'All'} 
                  onClick={() => setSelectedDay('All')} 
                />
                {days.map((day) => (
                  <FilterChip
                    key={day}
                    label={isCompact ? DAY_LABELS_FR_SHORT[day] : DAY_LABELS_FR_FULL[day]}
                    isActive={selectedDay === day}
                    colorClass={getDayColor(day)}
                    onClick={() => setSelectedDay(day)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Liste Scrollable qui prend l'espace restant */}
          <ScrollArea className="flex-1 w-full h-full">
            <div className="p-4 space-y-3 pb-20"> {/* pb-20 pour éviter que le dernier élément soit coupé */}
              {sortedAnime.length === 0 ? (
                <EmptyState label="Aucun animé en diffusion" icon={Tv} />
              ) : (
                sortedAnime.map((anime, idx) => (
                  <AnimeItem
                    key={`${anime.id}-${idx}`}
                    anime={anime}
                    isCompact={isCompact}
                    sonarrIntegration={sonarrIntegration}
                    isAdding={addingToSonarr?.[anime.id]}
                    onAddToSonarr={handleAddToSonarr}
                    // AFFICHER LE JOUR SI "ALL" EST SÉLECTIONNÉ
                    showDayInfo={selectedDay === 'All'}
                    langTag={animeLangMap?.[anime.id] || 'auto'}
                    onLangChange={(tag: 'vf'|'vostfr'|'auto') => {
                      const next = { ...(animeLangMap||{}), [anime.id]: tag };
                      setAnimeLangMap(next);
                      try { localStorage.setItem('animeLangMap', JSON.stringify(next)); } catch (e) {}
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="manga" className="flex-1 flex flex-col h-full min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="flex-1 w-full h-full">
            <div className="p-4 space-y-3 pb-20">
              {mangaReleases.length === 0 ? (
                <EmptyState label="Aucune sortie manga" icon={BookOpen} />
              ) : (
                mangaReleases.map((manga) => (
                  <MangaItem key={manga.id} manga={manga} isCompact={isCompact} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// --- SOUS-COMPOSANTS ---

function FilterChip({ label, isActive, colorClass, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-all border",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-accent",
        // If a colorClass is provided and not active, apply it to give a colored hint
        !isActive && colorClass ? `${colorClass} border-transparent` : ""
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ label, icon: Icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
      <Icon className="h-10 w-10 mb-2 opacity-20" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function AnimeItem({ anime, isCompact, sonarrIntegration, isAdding, onAddToSonarr, showDayInfo, langTag = 'auto', onLangChange }: any) {
  const nextEp = anime.nextAiringEpisode;
  
  // Calcul du jour pour l'affichage conditionnel
  let dayName = null;
  if (nextEp) {
    const date = new Date(nextEp.airingAt * 1000);
    dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  }
  
  return (
    <div className="group relative flex gap-4 p-3 rounded-xl border bg-card/50 hover:bg-accent/50 transition-all hover:shadow-sm hover:border-primary/20">
      {/* Cover */}
      <div className="relative shrink-0 w-[80px] h-[110px] rounded-md overflow-hidden bg-muted">
        <img
          src={anime.coverImage.medium}
          alt={anime.title.romaji}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {nextEp && !isCompact && (
          <div className="absolute bottom-0 left-0 w-[80px] bg-black/60 backdrop-blur-[2px] text-[12px] text-white text-center py-0.5 font-medium">
            Ep {nextEp.episode}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-medium text-base leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
              {anime.title.english || anime.title.romaji}
            </h4>
            
            {/* Sonarr Button + Lang tag selector */}
            <div className="flex items-center gap-2">
              {sonarrIntegration && !isCompact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => onAddToSonarr(e, anime)}
                  disabled={isAdding}
                >
                  {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              )}

              <select
                value={langTag || 'auto'}
                onChange={(e) => { const v = e.target.value as 'vf'|'vostfr'|'auto'; if (onLangChange) onLangChange(v); }}
                className="text-[11px] bg-background border border-border rounded px-2 py-1"
                title="Marquer disponibilité audio"
              >
                <option value="auto">Auto</option>
                <option value="vf">VF</option>
                <option value="vostfr">VOSTFR</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* BADGE JOUR COLORÉ (Si demandé) */}
            {showDayInfo && dayName && (
               <Badge variant="outline" className={cn("text-[10px] px-2 h-5 font-normal border-0", getDayColor(dayName))}>
                 {DAY_LABELS_FR_FULL[dayName] || dayName}
               </Badge>
            )}

            {anime.averageScore && (
              <span className="flex items-center text-[11px] text-muted-foreground font-medium">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                {Math.round(anime.averageScore / 10)}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
              {anime.genres?.[0]}
            </span>
          </div>
        </div>

        {/* Footer info (Temps restant) */}
        {nextEp && (
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal bg-secondary/50 text-secondary-foreground">
                <Clock className="h-3 w-3 mr-1 opacity-70" />
                {formatTimeUntilAiring(nextEp.timeUntilAiring)}
             </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function MangaItem({ manga, isCompact }: any) {
  return (
    <div className="group flex gap-3 p-2 rounded-xl border bg-card/50 hover:bg-accent/50 transition-all">
      <div className="relative shrink-0 w-[50px] h-[70px] rounded-md overflow-hidden bg-muted">
        <img 
          src={manga.coverImage.medium} 
          alt={manga.title.romaji} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col py-0.5">
        <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {manga.title.english || manga.title.romaji}
        </h4>
        <div className="flex items-center gap-2 mt-auto">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal border-border/50">
            {manga.format}
          </Badge>
           {manga.status === 'RELEASING' && (
             <span className="text-[10px] text-green-500 font-medium">En cours</span>
           )}
        </div>
      </div>
    </div>
  );
}