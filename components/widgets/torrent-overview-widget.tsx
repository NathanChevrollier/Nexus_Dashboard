'use client';

import { useEffect, useState, useMemo } from 'react';
import { Widget } from '@/lib/db/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowDown, 
  ArrowUp, 
  HardDrive, 
  Network, 
  Pause, 
  Check, 
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  UploadCloud,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TorrentOverviewWidgetProps {
  widget: Widget;
}

interface TorrentSummary {
  id?: string;
  name: string;
  progress: number;
  state: string;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  size: number;
}

interface TorrentOverviewResponse {
  totalDownloadSpeed: number;
  totalUploadSpeed: number;
  activeCount: number;
  completedCount: number;
  torrents: TorrentSummary[];
}

export function TorrentOverviewWidget({ widget }: TorrentOverviewWidgetProps) {
  const options = widget.options as {
    title?: string;
    integrationId?: string;
    limitActive?: number;
    showCompleted?: boolean;
    refreshInterval?: number;
  };

  const [data, setData] = useState<TorrentOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("downloading");

  const integrationId = options.integrationId;
  const refreshInterval = (options.refreshInterval || 3) * 1000;

  const fetchData = async (isBackground = false) => {
    if (!integrationId) return;

    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    
    setError(null);

    try {
      const res = await fetch('/api/integrations/torrent/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          integrationId, 
          limitActive: options.limitActive || 20, // On demande plus pour pouvoir filtrer localement
          showCompleted: true // On force true pour remplir l'onglet "Terminés"
        }),
      });

      if (!res.ok) throw new Error('Erreur API');

      const json = (await res.json()) as TorrentOverviewResponse;
      setData(json);
    } catch (e: any) {
      if (!isBackground) setError('Connexion échouée');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [integrationId, refreshInterval]);

  // --- FILTRAGE ET TRI ---

  const { downloading, completed, all } = useMemo(() => {
    if (!data?.torrents) return { downloading: [], completed: [], all: [] };

    const allSorted = [...data.torrents].sort((a, b) => {
        // Tri par vitesse DL, puis vitesse UP, puis progression
        if (a.downloadSpeed !== b.downloadSpeed) return b.downloadSpeed - a.downloadSpeed;
        if (a.uploadSpeed !== b.uploadSpeed) return b.uploadSpeed - a.uploadSpeed;
        return b.progress - a.progress;
    });

    const downloading = allSorted.filter(t => t.progress < 1);
    const completed = allSorted.filter(t => t.progress >= 1);

    return { downloading, completed, all: allSorted };
  }, [data]);

  // --- HELPERS VISUELS ---

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytes: number) => `${formatBytes(bytes)}/s`;

  const formatEta = (seconds: number) => {
    if (seconds <= 0 || seconds >= 8640000) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) return '> 1j';
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  // --- RENDU ---

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full animate-pulse bg-card/50">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-6 w-12 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-muted/30 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card/40 relative group overflow-hidden">
      
      {/* HEADER GLOBAL (Vitesse Totale) */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/60 backdrop-blur-md z-10 shrink-0 h-16">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">{options.title || 'Torrents'}</span>
          </div>
          {data && (
            <div className="flex items-center gap-3 text-[10px] mt-1 text-muted-foreground font-mono">
              <span className={cn("flex items-center gap-1", data.totalDownloadSpeed > 0 && "text-emerald-500 font-bold")}>
                <ArrowDown className="h-3 w-3" /> {formatSpeed(data.totalDownloadSpeed)}
              </span>
              <span className="h-2 w-px bg-border" />
              <span className={cn("flex items-center gap-1", data.totalUploadSpeed > 0 && "text-blue-500 font-bold")}>
                <ArrowUp className="h-3 w-3" /> {formatSpeed(data.totalUploadSpeed)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
           <div className={cn("transition-opacity duration-300", isRefreshing ? "opacity-100" : "opacity-0")}>
             <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
           </div>
        </div>
      </div>

      {/* CONTENU AVEC ONGLETS */}
      {!integrationId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-10 w-10 text-yellow-500 mb-2 opacity-50" />
          <p className="text-sm font-medium">Non configuré</p>
          <p className="text-xs text-muted-foreground">Sélectionnez une intégration dans les réglages</p>
        </div>
      ) : error && !data ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-xs">{error}</p>
          <button onClick={() => fetchData()} className="mt-2 text-[10px] underline hover:opacity-80">Réessayer</button>
        </div>
      ) : (
        <Tabs defaultValue="downloading" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          
          <div className="px-4 pt-3 pb-1 bg-card/30">
            <TabsList className="w-full grid grid-cols-3 h-8 p-0.5 bg-muted/50">
              <TabsTrigger value="downloading" className="text-[10px] h-7 px-1 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                En cours ({downloading.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-[10px] h-7 px-1 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Terminés ({completed.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-[10px] h-7 px-1 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Tout ({all.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 bg-background/10">
            <TabsContent value="downloading" className="h-full mt-0">
              <TorrentList list={downloading} type="downloading" />
            </TabsContent>
            
            <TabsContent value="completed" className="h-full mt-0">
              <TorrentList list={completed} type="completed" />
            </TabsContent>
            
            <TabsContent value="all" className="h-full mt-0">
              <TorrentList list={all} type="all" />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );

  // Sous-composant de liste pour éviter la répétition
  function TorrentList({ list, type }: { list: TorrentSummary[], type: 'downloading' | 'completed' | 'all' }) {
    if (list.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
          {type === 'downloading' ? <Check className="h-10 w-10 mb-2" /> : 
           type === 'completed' ? <Download className="h-10 w-10 mb-2" /> :
           <Layers className="h-10 w-10 mb-2" />}
          <p className="text-xs font-medium">
            {type === 'downloading' ? "Aucun téléchargement actif" : 
             type === 'completed' ? "Aucun torrent terminé" : 
             "Liste vide"}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2 p-3">
          {list.map((t, idx) => (
            <TorrentItem key={`${t.name}-${idx}`} t={t} />
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Sous-composant Item
  function TorrentItem({ t }: { t: TorrentSummary }) {
    const isError = t.state.toLowerCase().includes('error');
    const isPaused = t.state.toLowerCase().includes('paused') || t.state.toLowerCase().includes('stop');
    const isCompleted = t.progress >= 1;
    const isDownloading = !isCompleted && !isPaused && !isError;
    const isSeeding = isCompleted && (t.state.toLowerCase().includes('upload') || t.state.toLowerCase().includes('seed'));

    const percent = Math.min(100, Math.round(t.progress * 100));
    const eta = formatEta(t.eta);

    return (
      <div className="group relative flex flex-col gap-1.5 rounded-xl border bg-card p-3 hover:bg-accent/40 hover:border-primary/30 transition-all shadow-sm">
        
        {/* Row 1: Title & Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-full shrink-0", 
              isError ? "bg-red-500/10 text-red-500" :
              isPaused ? "bg-yellow-500/10 text-yellow-500" :
              isSeeding ? "bg-blue-500/10 text-blue-500" :
              isCompleted ? "bg-emerald-500/10 text-emerald-500" :
              "bg-primary/10 text-primary"
            )}>
              {isError ? <AlertCircle className="h-3 w-3" /> :
               isPaused ? <Pause className="h-3 w-3" /> :
               isSeeding ? <UploadCloud className="h-3 w-3" /> :
               isCompleted ? <Check className="h-3 w-3" /> :
               <ArrowDown className="h-3 w-3" />}
            </div>
            <div className="truncate text-xs font-semibold text-foreground/90" title={t.name}>
              {t.name}
            </div>
          </div>
          
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-0 bg-muted/50 font-normal tabular-nums">
            {percent}%
          </Badge>
        </div>

        {/* Row 2: Progress Bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60 mt-1">
          <div
            className={cn("h-full transition-all duration-700 ease-out rounded-full", 
              isError ? 'bg-red-500' :
              isPaused ? 'bg-yellow-500' :
              isSeeding ? 'bg-blue-500' :
              isCompleted ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Row 3: Meta Info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 opacity-80">
              <HardDrive className="h-3 w-3" /> {formatBytes(t.size)}
            </span>
            {eta && isDownloading && (
              <span className="flex items-center gap-1 text-primary">
                <Clock className="h-3 w-3" /> {eta}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {t.downloadSpeed > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-500 font-medium">
                <ArrowDown className="h-3 w-3" /> {formatSpeed(t.downloadSpeed)}
              </span>
            )}
            {t.uploadSpeed > 0 && (
              <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                <ArrowUp className="h-3 w-3" /> {formatSpeed(t.uploadSpeed)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
}