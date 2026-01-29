"use client";

import { useMemo, useState } from "react";
import { Widget } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPingWidgetProps {
  widget: Widget;
}

export function LinkPingWidget({ widget }: LinkPingWidgetProps) {
  const { title, url, host, port, openInNewTab, icon, iconUrl } = widget.options as any;
  const [imgError, setImgError] = useState(false);

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
        "group h-full w-full flex flex-col items-center justify-between p-2 rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300 relative overflow-hidden",
        target.effectiveUrl ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : ''
      )}
    >
        {/* --- Status Indicator (Absolute Top Right) --- */}
        <div className="absolute top-2 right-2 z-20 flex items-center justify-center">
            {isLoading ? (
               <Loader2 className="h-2 w-2 animate-spin text-muted-foreground" />
            ) : (
               <div className={cn("h-2 w-2 rounded-full shadow-[0_0_4px_currentColor]", getStatusDotColor())} />
            )}
        </div>

        {/* --- ICON / IMAGE CENTRALE --- */}
        <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
          {iconUrl && !imgError ? (
            <img
              src={iconUrl}
              alt={title || "icon"}
              className="w-full h-full max-w-[80%] max-h-[80%] object-contain transition-transform duration-300 group-hover:scale-110"
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-3xl md:text-4xl transition-transform duration-300 group-hover:scale-110">
              {icon || <Globe className="h-8 w-8 text-muted-foreground" />}
            </div>
          )}
        </div>

        {/* --- Label (Bottom) --- */}
        <div className="w-full mt-1 px-1">
          <h3 className="text-[10px] sm:text-xs font-medium text-center truncate text-muted-foreground group-hover:text-foreground transition-colors">
            {title || target.effectiveHost || "Service"}
          </h3>
          {/* Optional Latency on hover or if error */}
          {(!isUp && !isLoading && error) && (
              <p className="text-[9px] text-destructive text-center font-bold">DOWN</p>
          )}
        </div>
    </div>
  );
}