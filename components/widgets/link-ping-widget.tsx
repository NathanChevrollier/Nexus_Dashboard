"use client";

import { useMemo } from "react";
import { Widget } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPingWidgetProps {
  widget: Widget;
}

export function LinkPingWidget({ widget }: LinkPingWidgetProps) {
  const { title, url, host, port, openInNewTab, icon, iconUrl } = widget.options as any;

  // 1. Calcul de la cible
  const target = useMemo(() => {
    let effectiveUrl = url;
    let effectiveHost = host;
    let effectivePort = port ? Number(port) : undefined;

    try {
      if (!effectiveUrl && effectiveHost && (effectiveHost.startsWith('http') || effectiveHost.startsWith('https'))) {
        effectiveUrl = effectiveHost;
      }
      
      if (effectiveUrl) {
        const u = new URL(effectiveUrl);
        if (!effectiveHost) effectiveHost = u.hostname;
        if (u.port) effectivePort = Number(u.port);
      }
    } catch (e) { /* ignore */ }

    return { effectiveUrl, effectiveHost, effectivePort };
  }, [url, host, port]);

  // 2. Requête Ping
  const { data, isLoading, error } = useQuery({
    queryKey: ["link-ping", widget.id, target.effectiveHost, target.effectivePort],
    queryFn: async () => {
      if (!target.effectiveHost) throw new Error("Config manquante");
      
      const body: any = { host: target.effectiveHost };
      if (target.effectivePort) body.port = target.effectivePort;

      const response = await fetch("/api/widgets/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) throw new Error("Down");
      return response.json();
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const isUp = data?.status === "up";
  const latency = data?.responseTime || 0;

  // 3. Gestion du Click
  const handleOpen = () => {
    if (!target.effectiveUrl) return;
    const dest = openInNewTab ? "_blank" : "_self";
    window.open(target.effectiveUrl, dest, openInNewTab ? 'noopener,noreferrer' : undefined);
  };

  // 4. Styles dynamiques pour la pastille
  const getStatusDotColor = () => {
    if (isLoading) return "bg-gray-400";
    if (error || !isUp) return "bg-red-500 animate-pulse";
    if (latency < 100) return "bg-emerald-500";
    if (latency < 300) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div
      onClick={() => { if (target.effectiveUrl) handleOpen(); }}
      className={cn(
        "group relative h-full w-full flex flex-col p-1 rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300",
        target.effectiveUrl ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : ''
      )}
    >
      {/* Conteneur interne pour l'image (arrondi légèrement plus petit) */}
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-background/50 flex items-center justify-center">
        
        {/* --- HEADER : Titre avec overlay sombre --- */}
        <div className="absolute top-0 inset-x-0 z-20 p-2 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
          <h3 className="text-[11px] font-bold text-white text-center truncate drop-shadow-md tracking-wide">
            {title || target.effectiveHost || "Service"}
          </h3>
        </div>

        {/* --- BACKGROUND : Image ou Icône --- */}
        <div className="absolute inset-0 z-0 flex items-center justify-center p-2">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt="icon"
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 transition-transform duration-500 group-hover:scale-105 rounded-md">
              {icon ? (
                <span className="text-5xl filter drop-shadow-sm">{icon}</span>
              ) : (
                <Globe className="h-12 w-12 text-muted-foreground/30" />
              )}
            </div>
          )}
        </div>

        {/* --- FOOTER : La fameuse "Pillule" (Status + Latency) --- */}
        <div className="absolute bottom-2 right-2 z-20">
          <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-lg">
            
            {/* Le Point de couleur */}
            <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]", getStatusDotColor())} />
            
            {/* Le Texte (ms) */}
            <span className="text-[9px] font-bold text-white/90 tabular-nums leading-none">
              {isLoading ? (
                <Loader2 className="h-2 w-2 animate-spin" />
              ) : error || !isUp ? (
                "OFF"
              ) : (
                `${latency}ms`
              )}
            </span>
          </div>
        </div>

        {/* Petit indicateur de lien au survol */}
        {target.effectiveUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10" />
        )}
      </div>
    </div>
  );
}