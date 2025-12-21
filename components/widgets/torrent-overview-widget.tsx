'use client';

import { useEffect, useState } from 'react';
import { Widget } from '@/lib/db/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDownToLine, ArrowUpToLine, HardDrive, Loader2, Network, PlayCircle, PauseCircle, AlertTriangle } from 'lucide-react';

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
  };

  const [data, setData] = useState<TorrentOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const integrationId = options.integrationId;
  const limitActive = options.limitActive && options.limitActive > 0 ? options.limitActive : 8;
  const showCompleted = options.showCompleted ?? false;

  useEffect(() => {
    const load = async () => {
      if (!integrationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/integrations/torrent/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId, limitActive, showCompleted }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Erreur lors du chargement des torrents');
        }

        const json = (await res.json()) as TorrentOverviewResponse;
        setData(json);
      } catch (e: any) {
        console.error('Erreur TorrentOverviewWidget:', e);
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [integrationId, limitActive, showCompleted]);

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    const kb = bytesPerSec / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB/s`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB/s`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 1) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  const formatEta = (seconds: number) => {
    if (!seconds || seconds < 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
    return `${m} min`;
  };

  const renderStateIcon = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('down') || s.includes('stalled')) {
      return <ArrowDownToLine className="h-3 w-3 text-emerald-500" />;
    }
    if (s.includes('paused')) {
      return <PauseCircle className="h-3 w-3 text-yellow-500" />;
    }
    if (s.includes('upload')) {
      return <ArrowUpToLine className="h-3 w-3 text-blue-500" />;
    }
    return <PlayCircle className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Network className="h-4 w-4 text-primary" />
          <div className="truncate text-sm font-medium">
            {options.title || 'Torrent Overview'}
          </div>
        </div>
        {integrationId ? (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {data && (
              <>
                <span className="flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" />
                  {formatSpeed(data.totalDownloadSpeed)}
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUpToLine className="h-3 w-3" />
                  {formatSpeed(data.totalUploadSpeed)}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-700 dark:text-yellow-300">
            Aucune intégration configurée
          </span>
        )}
      </div>

      {!integrationId && (
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Configurez d'abord une intégration "Client Torrent" dans les Paramètres, puis éditez ce widget pour lui associer cette intégration.
        </div>
      )}

      {integrationId && loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {integrationId && !loading && error && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {integrationId && !loading && !error && data && (
        <>
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Actifs: {data.activeCount} • Terminés: {data.completedCount}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {data.torrents.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Aucun torrent à afficher.
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {data.torrents.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-start justify-between rounded border bg-card/80 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {renderStateIcon(t.state)}
                        <div className="truncate text-[13px] font-medium" title={t.name}>
                          {t.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatSize(t.size)}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <ArrowDownToLine className="h-3 w-3" />
                          {formatSpeed(t.downloadSpeed)}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <ArrowUpToLine className="h-3 w-3" />
                          {formatSpeed(t.uploadSpeed)}
                        </div>
                        <span>•</span>
                        <span>{formatEta(t.eta)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, Math.max(0, t.progress * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
