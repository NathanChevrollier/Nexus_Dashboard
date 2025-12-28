'use client';

import { useEffect, useState, useRef } from 'react';
import { Widget } from '@/lib/db/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownToLine, 
  ArrowUpToLine, 
  HardDrive, 
  Loader2, 
  Network, 
  PauseCircle, 
  PlayCircle, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assurez-vous d'avoir cet utilitaire (standard shadcn)

interface TorrentOverviewWidgetProps {
  widget: Widget;
}

interface TorrentSummary {
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
    refreshInterval?: number; // Nouvelle option
  };

  const [data, setData] = useState<TorrentOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const integrationId = options.integrationId;
  const limitActive = options.limitActive && options.limitActive > 0 ? options.limitActive : 8;
  const showCompleted = options.showCompleted ?? false;
  const refreshInterval = (options.refreshInterval || 5) * 1000; // Par défaut 5 secondes

  const fetchData = async (isBackground = false) => {
    if (!integrationId) return;

    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    
    setError(null);

    try {
      const res = await fetch('/api/integrations/torrent/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, limitActive, showCompleted }),
      });

      if (!res.ok) {
        throw new Error('Erreur API');
      }

      const json = (await res.json()) as TorrentOverviewResponse;
      setData(json);
    } catch (e: any) {
      console.error('Erreur TorrentWidget:', e);
      if (!isBackground) setError('Impossible de joindre le client Torrent');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load et Auto-refresh
  useEffect(() => {
    fetchData(); // Premier chargement

    const interval = setInterval(() => {
      fetchData(true); // Chargement en arrière-plan
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [integrationId, limitActive, showCompleted, refreshInterval]);

  // Helpers de formatage
  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatSpeed = (bytes: number) => `${formatBytes(bytes)}/s`;

  const formatEta = (seconds: number) => {
    if (seconds < 0 || seconds >= 8640000) return '∞'; // infini si > 100 jours
    if (seconds === 0) return 'Terminé';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (h > 24) return '> 1j';
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  // Détermination du style en fonction de l'état
  const getStatusConfig = (state: string, progress: number) => {
    const s = state.toLowerCase();
    if (s.includes('error')) return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Erreur' };
    if (s.includes('paused')) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: PauseCircle, label: 'Pause' };
    if (progress >= 1 || s.includes('upload') || s.includes('seed')) return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2, label: 'Seeding' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: ArrowDownToLine, label: 'Téléchargement' };
  };

  // Skeleton Loader
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full">
        <div className="flex justify-between items-center mb-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <div className="truncate text-sm font-semibold leading-none">
              {options.title || 'Torrents'}
            </div>
            {data && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-0.5">
                  <ArrowDownToLine className="h-2.5 w-2.5" />
                  {formatSpeed(data.totalDownloadSpeed)}
                </span>
                <span className="w-px h-2 bg-border" />
                <span className="flex items-center gap-0.5">
                  <ArrowUpToLine className="h-2.5 w-2.5" />
                  {formatSpeed(data.totalUploadSpeed)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Refresh Indicator */}
        <div className={cn("transition-opacity duration-500", isRefreshing ? "opacity-100" : "opacity-0")}>
           <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative">
        {!integrationId ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Configuration requise</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-red-500 font-medium">{error}</p>
            <button onClick={() => fetchData()} className="mt-2 text-[10px] underline text-muted-foreground hover:text-foreground">
              Réessayer
            </button>
          </div>
        ) : !data || data.torrents.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">Aucun téléchargement actif</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-3">
              {data.torrents.map((t, idx) => {
                const status = getStatusConfig(t.state, t.progress);
                const StatusIcon = status.icon;
                
                return (
                  <div key={`${t.name}-${idx}`} className="group relative flex flex-col gap-2 rounded-lg border bg-card/50 p-3 hover:bg-accent/50 transition-colors">
                    {/* Top Row: Title & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium" title={t.name}>
                          {t.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-2.5 w-2.5" />
                            {formatBytes(t.size)}
                          </span>
                          {t.eta > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatEta(t.eta)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5 gap-1 font-normal border-0", status.bg, status.color)}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">{status.label}</span>
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                      <div
                        className={cn("h-full transition-all duration-500 ease-out", 
                          status.label === 'Erreur' ? 'bg-red-500' :
                          status.label === 'Pause' ? 'bg-yellow-500' :
                          t.progress >= 1 ? 'bg-blue-500' : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(100, t.progress * 100)}%` }}
                      />
                    </div>

                    {/* Bottom Row: Speeds */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex gap-3">
                        <span className={cn("flex items-center gap-1 transition-colors", t.downloadSpeed > 0 && "text-emerald-500")}>
                          <ArrowDownToLine className="h-2.5 w-2.5" />
                          {formatSpeed(t.downloadSpeed)}
                        </span>
                        <span className={cn("flex items-center gap-1 transition-colors", t.uploadSpeed > 0 && "text-blue-500")}>
                          <ArrowUpToLine className="h-2.5 w-2.5" />
                          {formatSpeed(t.uploadSpeed)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">
                        {(t.progress * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}