"use client";

import { Widget } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle } from "lucide-react";

interface PingWidgetProps {
  widget: Widget;
}

export function PingWidget({ widget }: PingWidgetProps) {
  const { title, host, port } = widget.options;

  const { data, isLoading } = useQuery({
    queryKey: ["ping", widget.id, host, port],
    queryFn: async () => {
      const response = await fetch("/api/widgets/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port }),
      });
      return response.json();
    },
    refetchInterval: 30000, // Refresh toutes les 30 secondes
  });

  const getStatusColor = () => {
    if (isLoading) return "text-yellow-500";
    if (data?.status === "up") return "text-green-500";
    return "text-red-500";
  };

  const getStatusIcon = () => {
    if (isLoading) return <Activity className="h-8 w-8 animate-pulse" />;
    if (data?.status === "up") return <CheckCircle className="h-8 w-8" />;
    return <AlertCircle className="h-8 w-8" />;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className={`mb-3 ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
      <p className="font-medium text-center mb-1">{title || host}</p>
      <p className="text-xs text-muted-foreground">
        {isLoading ? "Checking..." : data?.status === "up" ? "Online" : "Offline"}
      </p>
      {data?.responseTime && (
        <p className="text-xs text-muted-foreground mt-1">
          {data.responseTime}ms
        </p>
      )}
    </div>
  );
}
