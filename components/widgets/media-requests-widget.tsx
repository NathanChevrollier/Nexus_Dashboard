'use client';

import { useEffect, useState } from 'react';
import { Widget } from '@/lib/db/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Film, Tv, User as UserIcon, Loader2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaRequestsWidgetProps {
  widget: Widget;
}

// CORRECTION 1 : Augmentation du timeout par défaut à 25s (au lieu de 10s)
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeout = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const finalInit = { ...init, signal: controller.signal };
    const res = await fetch(url, finalInit);
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface MediaRequestItem {
  id: number | string;
  status: string;
  createdAt: string;
  requestedBy: string;
  type: 'movie' | 'tv' | string;
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
}

export function MediaRequestsWidget({ widget }: MediaRequestsWidgetProps) {
  const options = widget.options as any;
  const [requests, setRequests] = useState<MediaRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const integrationId = options.integrationId;

  const statusFilter = options.statusFilter || 'all';
  const limit = options.limit && options.limit > 0 ? options.limit : 10;

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      if (!integrationId) {
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        // On appelle avec un timeout long pour laisser le temps au serveur de chercher les images
        const res = await fetchWithTimeout('/api/integrations/overseerr/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId, status: statusFilter, limit }),
        }, 25000); // 25 secondes

        if (!res.ok) {
          throw new Error(`Erreur API (${res.status})`);
        }

        const data = await res.json();
        
        if (isMounted) {
          setRequests(data.requests || []);
        }
      } catch (e: any) {
        console.error('Erreur MediaRequestsWidget:', e);
        if (isMounted) {
          // Message d'erreur plus convivial pour le timeout
          if (e.name === 'AbortError') {
            setError("Le serveur met trop de temps à répondre.");
          } else {
            setError("Impossible de charger les requêtes.");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRequests();

    return () => { isMounted = false; };
  }, [integrationId, statusFilter, limit]);

  // ... (Le reste de tes fonctions d'affichage getStatusStyle, getYear, render restent identiques)
  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();
    const base = "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm backdrop-blur-md";

    if (normalized.includes('approved')) {
      return cn(base, "bg-[#5b5bd6]/80 text-white border border-[#5b5bd6]/50");
    }
    if (normalized.includes('pending')) {
      return cn(base, "bg-amber-500/80 text-white border border-amber-500/50");
    }
    if (normalized.includes('declined')) {
      return cn(base, "bg-red-500/80 text-white border border-red-500/50");
    }
    return cn(base, "bg-secondary/80 text-secondary-foreground");
  };

  const getYear = (dateStr: string) => {
    try { return new Date(dateStr).getFullYear(); } catch { return ''; }
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="flex items-center gap-2 p-4 pb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
        {options.title || 'Dernières requêtes'}
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2">
        {!integrationId ? (
           <div className="flex h-full items-center justify-center flex-col gap-2 text-muted-foreground opacity-60">
             <Settings2 className="h-6 w-6" />
             <span className="text-xs">Configuration requise</span>
           </div>
        ) : loading ? (
           <div className="flex h-full items-center justify-center">
             <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
           </div>
        ) : error ? (
           <div className="flex h-full flex-col items-center justify-center p-4 text-center text-red-400 gap-2">
             <AlertCircle className="h-6 w-6" />
             <p className="text-xs">{error}</p>
           </div>
        ) : requests.length === 0 ? (
           <div className="flex h-full items-center justify-center text-muted-foreground text-xs opacity-60">
             Aucune requête trouvée
           </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="group relative flex items-center h-[70px] rounded-lg overflow-hidden border border-border/50 transition-all hover:border-primary/50 bg-card/40"
                >
                  {/* BACKGROUND */}
                  <div className="absolute inset-0 z-0">
                    {req.backdropUrl ? (
                      <img
                        src={req.backdropUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-background to-muted/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
                  </div>

                  {/* CONTENU */}
                  <div className="relative z-10 flex items-center w-full px-3 gap-3">
                    {/* Poster */}
                    <div className="shrink-0 w-[30px] h-[45px] rounded bg-black/40 shadow-sm overflow-hidden hidden sm:block border border-white/10">
                      {req.posterUrl ? (
                         <img src={req.posterUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center">
                           <Film className="h-3 w-3 text-white/20" />
                         </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-medium text-muted-foreground">
                            {getYear(req.createdAt)}
                         </span>
                         <span className={getStatusStyle(req.status)}>
                            {req.status === 'pending' ? 'ATTENTE' : req.status}
                         </span>
                         {/* Badge count si applicable, sinon retirer */}
                         {/* <Badge variant="secondary" className="h-4 px-1 text-[9px]">2</Badge> */}
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate pr-2 shadow-black drop-shadow-md">
                        {req.title}
                      </h4>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10 h-8 ml-auto">
                      <span className="text-[10px] font-medium text-foreground/70 hidden sm:block">
                        {req.requestedBy}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm">
                        <UserIcon className="h-3 w-3 text-white/80" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}