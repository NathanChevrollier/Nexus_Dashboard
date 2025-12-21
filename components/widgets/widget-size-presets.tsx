"use client";

import { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2, Square, RectangleHorizontal, RectangleVertical } from "lucide-react";

interface WidgetSizePresetsProps {
  widgetId: string;
  widgetType: string;
  currentSize: { w: number; h: number };
  onSizeChange: (widgetId: string, size: { w: number; h: number }) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

const sizePresetsByType: Record<string, Array<{ name: string; w: number; h: number; icon: any }>> = {
  link: [
    { name: "Compact", w: 1, h: 1, icon: Minimize2 },
    { name: "Standard", w: 2, h: 1, icon: RectangleHorizontal },
    { name: "Large", w: 3, h: 1, icon: Maximize2 },
  ],
  ping: [
    { name: "Mini", w: 2, h: 1, icon: RectangleHorizontal },
    { name: "Standard", w: 3, h: 1, icon: RectangleHorizontal },
    { name: "Large", w: 4, h: 1, icon: Maximize2 },
  ],
  weather: [
    { name: "Compact", w: 2, h: 1, icon: Minimize2 },
    { name: "Standard", w: 2, h: 2, icon: Square },
    { name: "Détaillé", w: 3, h: 3, icon: Maximize2 },
    { name: "Full", w: 4, h: 3, icon: Maximize2 },
  ],
  notes: [
    { name: "Mini", w: 2, h: 2, icon: Square },
    { name: "Standard", w: 3, h: 3, icon: Square },
    { name: "Large", w: 4, h: 4, icon: Maximize2 },
    { name: "Full", w: 6, h: 4, icon: RectangleHorizontal },
  ],
  chart: [
    { name: "Mini", w: 2, h: 2, icon: Square },
    { name: "Dashboard", w: 4, h: 2, icon: RectangleHorizontal },
    { name: "Large", w: 6, h: 3, icon: Maximize2 },
    { name: "Full Screen", w: 8, h: 4, icon: Maximize2 },
  ],
  iframe: [
    { name: "Standard", w: 4, h: 3, icon: Square },
    { name: "Wide", w: 6, h: 3, icon: RectangleHorizontal },
    { name: "Tall", w: 4, h: 5, icon: RectangleVertical },
    { name: "Full", w: 8, h: 6, icon: Maximize2 },
  ],
  datetime: [
    { name: "Compact", w: 2, h: 1, icon: RectangleHorizontal },
    { name: "Standard", w: 3, h: 1, icon: RectangleHorizontal },
    { name: "Large", w: 4, h: 2, icon: Square },
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
  const presets = sizePresetsByType[widgetType] || defaultSizePresets;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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

  return (
    <div
      ref={menuRef}
      className="fixed bg-card border-2 border-primary/20 shadow-2xl rounded-xl p-3 z-[9999] min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="mb-2 pb-2 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          📐 Tailles Rapides
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
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all hover:bg-accent group ${
                isCurrent ? "bg-primary/10 border-2 border-primary" : "border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {preset.w}×{preset.h}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Clic droit pour fermer
        </p>
      </div>
    </div>
  );
}
