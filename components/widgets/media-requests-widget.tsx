'use client';

import { useEffect, useState } from 'react';
import { Widget } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Clock, Film, Loader2, XCircle } from 'lucide-react';

interface MediaRequestsWidgetProps {
  widget: Widget;
}

interface MediaRequestItem {
  id: number | string;
  status: string;
  createdAt: string;
  requestedBy: string;
  type: 'movie' | 'tv' | string;
  title: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'declined';

export function MediaRequestsWidget({ widget }: MediaRequestsWidgetProps) {
  const options = widget.options as {
    title?: string;
    integrationId?: string;
    statusFilter?: StatusFilter;
    limit?: number;
  };

  const [requests, setRequests] = useState<MediaRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const integrationId = options.integrationId;
  const statusFilter: StatusFilter = options.statusFilter || 'all';
  const limit = options.limit && options.limit > 0 ? options.limit : 10;

  useEffect(() => {
    const loadRequests = async () => {
      if (!integrationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/integrations/overseerr/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationId,
            status: statusFilter,
            limit,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Erreur lors du chargement des requêtes');
        }

        const data = await res.json();
        setRequests(data.requests || []);
      } catch (e: any) {
        console.error('Erreur MediaRequestsWidget:', e);
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [integrationId, statusFilter, limit]);

  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized.includes('approved') || normalized.includes('accepted')) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 flex items-center gap-1 text-[10px]">
          <CheckCircle2 className="h-3 w-3" />
          Approuvée
        </Badge>
      );
    }

    if (normalized.includes('pending')) {
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1 text-[10px]">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>
      );
    }

    if (normalized.includes('declined') || normalized.includes('rejected')) {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/30 flex items-center gap-1 text-[10px]">
          <XCircle className="h-3 w-3" />
          Refusée
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-[10px]">
        {status}
      </Badge>
    );
  };

  const renderTypeIcon = (type: string) => {
    const normalized = type.toLowerCase();
    return (
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2">
        <Film className="h-4 w-4 text-primary" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Film className="h-4 w-4 text-primary" />
          <div className="truncate font-medium text-sm">
            {options.title || 'Media Requests'}
          </div>
        </div>
        {integrationId ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[140px]">
            Intégration liée
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
            Aucune intégration configurée
          </span>
        )}
      </div>

      {!integrationId && (
        <div className="text-xs text-muted-foreground bg-muted/40 border border-dashed border-border rounded-md p-3">
          Configurez d'abord une intégration "Overseerr" dans les Paramètres, puis éditez ce widget pour lui
          associer cette intégration.
        </div>
      )}

      {integrationId && loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {integrationId && !loading && error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-red-500 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {integrationId && !loading && !error && (
        <ScrollArea className="flex-1 min-h-0">
          {requests.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Aucune requête trouvée pour ce filtre.
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between rounded border bg-card/80 px-3 py-2 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {renderTypeIcon(req.type)}
                    <div className="space-y-1 min-w-0">
                      <div className="font-medium truncate text-[13px]" title={req.title}>
                        {req.title}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                        <span>Par {req.requestedBy}</span>
                        <span>•</span>
                        <span>
                          {new Date(req.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex flex-col items-end gap-1">
                    {renderStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
