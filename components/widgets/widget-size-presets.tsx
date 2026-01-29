"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { 
  Maximize2, 
  Minimize2, 
  Square, 
  RectangleHorizontal, 
  RectangleVertical,
  LayoutGrid,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetSizePresetsProps {
  widgetId: string;
  widgetType: string;
  currentSize: { w: number; h: number };
  onSizeChange: (widgetId: string, size: { w: number; h: number }) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

// Configuration exhaustive des tailles pour TOUS les widgets
const sizePresetsByType: Record<string, Array<{ name: string; w: number; h: number; icon: any }>> = {
  // --- LIENS & TOOLS ---
  link: [
    { name: "Standard", w: 1, h: 1, icon: Square },
    { name: "Moyen", w: 2, h: 2, icon: Square },
    { name: "Grand", w: 3, h: 3, icon: Maximize2 },
  ],
  "link-ping": [
    { name: "Standard", w: 1, h: 1, icon: Square },
    { name: "Moyen", w: 2, h: 2, icon: Square },
    { name: "Grand", w: 3, h: 3, icon: Maximize2 },
  ],
  ping: [
    { name: "Compact", w: 2, h: 1, icon: RectangleHorizontal },
    { name: "Standard", w: 3, h: 2, icon: RectangleHorizontal },
  ],
  
  // --- CONTENU & LISTES ---
  notes: [
    { name: "Post-it", w: 2, h: 2, icon: Square },
    { name: "Standard", w: 4, h: 4, icon: Square },
    { name: "Large", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  "todo-list": [
    { name: "Liste", w: 3, h: 4, icon: RectangleVertical },
    { name: "Compact", w: 2, h: 3, icon: RectangleVertical },
    { name: "Large", w: 4, h: 5, icon: RectangleVertical },
  ],
  watchlist: [
    { name: "Standard", w: 4, h: 4, icon: Square },
    { name: "Mur", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  bookmarks: [
    { name: "Grille", w: 4, h: 4, icon: Square },
    { name: "Compact", w: 3, h: 3, icon: Square },
  ],

  // --- MÉDIAS & INTÉGRATIONS ---
  "media-requests": [
    { name: "Liste", w: 4, h: 4, icon: Square },
    { name: "Compact", w: 3, h: 3, icon: Square },
    { name: "Large", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  "torrent-overview": [
    { name: "Standard", w: 4, h: 4, icon: Square },
    { name: "Large", w: 6, h: 3, icon: RectangleHorizontal },
    { name: "Compact", w: 3, h: 3, icon: Square },
  ],
  "media-library": [
    { name: "Standard", w: 4, h: 3, icon: RectangleHorizontal },
    { name: "Large", w: 5, h: 4, icon: Square },
  ],
  monitoring: [
    { name: "Standard", w: 4, h: 3, icon: RectangleHorizontal },
    { name: "Compact", w: 2, h: 2, icon: Square },
    { name: "Dashboard", w: 6, h: 3, icon: RectangleHorizontal },
  ],

  // --- CALENDRIERS & TEMPS ---
  weather: [
    { name: "Compact", w: 2, h: 2, icon: Square },
    { name: "Semaine", w: 4, h: 2, icon: RectangleHorizontal },
    { name: "Détaillé", w: 3, h: 3, icon: Square },
  ],
  datetime: [
    { name: "Compact", w: 2, h: 1, icon: RectangleHorizontal },
    { name: "Horloge", w: 2, h: 2, icon: Square },
    { name: "Complet", w: 4, h: 2, icon: RectangleHorizontal },
  ],
  "anime-calendar": [
    { name: "Grille", w: 4, h: 4, icon: Square },
    { name: "Large", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  "movies-tv-calendar": [
    { name: "Standard", w: 4, h: 4, icon: Square },
    { name: "Large", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  "universal-calendar": [
    { name: "Standard", w: 5, h: 5, icon: Square },
    { name: "Large", w: 7, h: 5, icon: RectangleHorizontal },
  ],
  countdown: [
    { name: "Carte", w: 3, h: 3, icon: Square },
    { name: "Compact", w: 2, h: 2, icon: Square },
  ],
  timer: [
    { name: "Standard", w: 3, h: 4, icon: RectangleVertical },
    { name: "Compact", w: 2, h: 2, icon: Square },
  ],

  // --- DIVERS ---
  iframe: [
    { name: "Standard", w: 4, h: 3, icon: RectangleHorizontal },
    { name: "Vidéo", w: 4, h: 3, icon: RectangleHorizontal },
    { name: "Page", w: 5, h: 6, icon: RectangleVertical },
    { name: "Full", w: 8, h: 6, icon: Monitor },
  ],
  chart: [
    { name: "Standard", w: 5, h: 3, icon: RectangleHorizontal },
    { name: "Large", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  quote: [
    { name: "Carte", w: 4, h: 3, icon: RectangleHorizontal },
    { name: "Bannière", w: 6, h: 2, icon: RectangleHorizontal },
  ],
};

const defaultSizePresets = [
  { name: "Petit", w: 2, h: 2, icon: Minimize2 },
  { name: "Moyen", w: 3, h: 3, icon: Square },
  { name: "Grand", w: 4, h: 4, icon: Maximize2 },
];

export function WidgetSizePresets({
  widgetId,
  widgetType,
  currentSize,
  onSizeChange,
  position,
  onClose,
}: WidgetSizePresetsProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // État pour la position ajustée (pour éviter de sortir de l'écran)
  const [adjustedPos, setAdjustedPos] = useState(position);
  
  const presets = sizePresetsByType[widgetType] || defaultSizePresets;

  // Calcul intelligent de la position pour rester dans l'écran
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Si ça dépasse à droite
      if (newX + rect.width > viewportW) {
        newX = position.x - rect.width;
      }
      // Si ça dépasse en bas
      if (newY + rect.height > viewportH) {
        newY = position.y - rect.height;
      }

      setAdjustedPos({ x: newX, y: newY });
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleSizeSelect = (size: { w: number; h: number }) => {
    onSizeChange(widgetId, size);
    onClose();
  };

  // Vérifier si la taille actuelle correspond à un preset
  const isCustomSize = !presets.some(p => p.w === currentSize.w && p.h === currentSize.h);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] rounded-xl border bg-popover p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
    >
      <div className="mb-2 px-2 py-1.5 border-b border-border/50">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid className="h-3 w-3" />
          Redimensionner
        </p>
      </div>
      
      <div className="space-y-1">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isCurrent = currentSize.w === preset.w && currentSize.h === preset.h;
          
          return (
            <button
              key={preset.name}
              onClick={() => handleSizeSelect({ w: preset.w, h: preset.h })}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all relative overflow-hidden",
                isCurrent 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-accent text-foreground hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3 z-10">
                <Icon className={cn("h-4 w-4", isCurrent ? "opacity-100" : "opacity-70")} />
                <span className="font-medium">{preset.name}</span>
              </div>
              <span className={cn("text-[10px] font-mono opacity-70 z-10", isCurrent ? "text-primary-foreground" : "text-muted-foreground")}>
                {preset.w}×{preset.h}
              </span>
            </button>
          );
        })}

        {isCustomSize && (
          <div className="mt-2 px-3 py-1.5 bg-muted/30 rounded-md border border-dashed border-muted-foreground/20 flex justify-between items-center text-xs text-muted-foreground">
            <span>Taille actuelle (Custom)</span>
            <span className="font-mono">{currentSize.w}×{currentSize.h}</span>
          </div>
        )}
      </div>
    </div>
  );
}