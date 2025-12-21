'use client';

import { useEffect, useState } from 'react';
import { Widget } from '@/lib/db/schema';
import { Cpu, Activity, HardDrive, Loader2, AlertTriangle, Gauge } from 'lucide-react';

interface MonitoringWidgetProps {
  widget: Widget;
}

interface MonitoringOverviewResponse {
  cpu: number;
  mem: {
    used: number;
    total: number;
  };
  load: {
    min1: number;
    min5: number;
    min15: number;
  };
  uptime: string;
}

export function MonitoringWidget({ widget }: MonitoringWidgetProps) {
  const options = widget.options as {
    title?: string;
    integrationId?: string;
  };

  const [data, setData] = useState<MonitoringOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const integrationId = options.integrationId;

  useEffect(() => {
    const load = async () => {
      if (!integrationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/integrations/monitoring/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Erreur lors du chargement du monitoring');
        }

        const json = (await res.json()) as MonitoringOverviewResponse;
        setData(json);
      } catch (e: any) {
        console.error('Erreur MonitoringWidget:', e);
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [integrationId]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 1) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  const memUsagePercent = data
    ? Math.min(100, Math.max(0, (data.mem.used / Math.max(1, data.mem.total)) * 100))
    : 0;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="h-4 w-4 text-primary" />
          <div className="truncate text-sm font-medium">
            {options.title || 'Monitoring'}
          </div>
        </div>
      </div>

      {!integrationId && (
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Configurez d'abord une intégration "Monitoring" (par exemple Glances HTTP) dans les Paramètres, puis éditez ce widget pour lui associer cette intégration.
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
        <div className="flex flex-1 flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card/80 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" /> CPU
                </span>
                <span className="text-sm font-semibold">{data.cpu.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, data.cpu))}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card/80 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" /> Mémoire
                </span>
                <span className="text-sm font-semibold">{memUsagePercent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${memUsagePercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Utilisée: {formatBytes(data.mem.used)}</span>
                <span>Total: {formatBytes(data.mem.total)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card/80 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Load
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>1m: {data.load.min1.toFixed(2)}</span>
                <span>5m: {data.load.min5.toFixed(2)}</span>
                <span>15m: {data.load.min15.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-lg border bg-card/80 p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Uptime</span>
              </div>
              <div className="text-sm font-semibold">{data.uptime}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
