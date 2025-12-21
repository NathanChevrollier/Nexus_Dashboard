"use client";

import { useState, useEffect } from "react";
import { Widget } from "@/lib/db/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";

interface DateTimeWidgetProps {
  widget: Widget;
}

export function DateTimeWidget({ widget }: DateTimeWidgetProps) {
  const { format: dateFormat = "PPP", timezone } = widget.options;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Calendar className="h-5 w-5" />
        <Clock className="h-5 w-5" />
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-bold">
          {format(currentTime, "HH:mm:ss")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>
    </div>
  );
}
