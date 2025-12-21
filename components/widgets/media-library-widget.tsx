"use client";

import Link from "next/link";
import { Widget } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Film, Tv, Music2 } from "lucide-react";

interface MediaLibraryWidgetProps {
  widget: Widget;
}

export function MediaLibraryWidget({ widget }: MediaLibraryWidgetProps) {
  const title = (widget.options as any)?.title || "Médiathèque";

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              Accédez à votre page complète films / séries / musiques.
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Film className="h-3 w-3 text-primary" />
          <span>Films</span>
        </div>
        <div className="flex items-center gap-1">
          <Tv className="h-3 w-3 text-primary" />
          <span>Séries</span>
        </div>
        <div className="flex items-center gap-1">
          <Music2 className="h-3 w-3 text-primary" />
          <span>Musiques</span>
        </div>
      </div>
      <div className="mt-auto flex justify-end">
        <Link href="/media-library" className="w-full">
          <Button size="sm" className="w-full">
            Ouvrir la médiathèque
          </Button>
        </Link>
      </div>
    </div>
  );
}
