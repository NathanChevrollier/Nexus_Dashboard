"use client";

import { Widget } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle } from "lucide-react";

interface PingWidgetProps {
  widget: Widget;
}

export function PingWidget({ widget }: PingWidgetProps) {
  const { title, host, port } = widget.options;
  // Support parsing host/port from a provided URL (ex: https://example.com:8080/path)
  let effectiveHost: string | undefined = host;
  let effectivePort: number | undefined = port ? Number(port) : undefined;
  try {
    if (!effectiveHost && widget.options.url) {
      const u = new URL(widget.options.url);
      effectiveHost = u.hostname;
      if (u.port) effectivePort = Number(u.port);
    }
    // If host field is a full URL, parse it too
    if (effectiveHost && (effectiveHost.startsWith('http://') || effectiveHost.startsWith('https://'))) {
      const u = new URL(effectiveHost);
      effectiveHost = u.hostname;
      if (u.port) effectivePort = Number(u.port);
    }
  } catch (e) {
    // ignore parsing errors
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["ping", widget.id, effectiveHost, effectivePort],
    queryFn: async () => {
      if (!effectiveHost) throw new Error("Host not configured");
      const body: any = { host: effectiveHost };
      if (effectivePort) body.port = effectivePort;

      const response = await fetch("/api/widgets/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Ping failed");
      return response.json();
    },
    refetchInterval: 30000,
    retry: 1,
  });

  if (!host) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <AlertCircle className="h-8 w-8 text-yellow-500 mb-3" />
        <p className="text-xs text-muted-foreground text-center">Host not configured</p>
      </div>
    );
  }

  const getStatusColor = () => {
    if (isLoading) return "text-yellow-500";
    if (error) return "text-red-500";
    if (data?.status === "up") return "text-green-500";
    return "text-red-500";
  };

  const getStatusIcon = () => {
    if (isLoading) return <Activity className="h-8 w-8 animate-pulse" />;
    if (error) return <AlertCircle className="h-8 w-8" />;
    if (data?.status === "up") return <CheckCircle className="h-8 w-8" />;
    return <AlertCircle className="h-8 w-8" />;
  };

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (error) return "Error";
    if (data?.status === "up") return "Online";
    return "Offline";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className={`mb-3 ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
      <p className="font-medium text-center mb-1">{title || host}</p>
      <p className="text-xs text-muted-foreground">
        {getStatusText()}
      </p>
      {data?.responseTime && (
        <p className="text-xs text-muted-foreground mt-1">
          {data.responseTime}ms
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1 text-center">
          {error.message}
        </p>
      )}
    </div>
  );
}
