"use client";

import { Widget } from "@/lib/db/schema";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-v2"; // Correction de l'import
import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface DraggableWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  sourceType: 'main' | 'category';
  sourceCategoryId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  // Props injectées par CustomGridLayout (nécessaires pour le positionnement)
  style?: CSSProperties;
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}

export function DraggableWidget({
  widget,
  isEditMode,
  sourceType,
  sourceCategoryId,
  onEdit,
  onDelete,
  style,
  className,
  ...gridProps // Capture les événements de la grille (onPointerDown, etc.)
}: DraggableWidgetProps) {
  const { isDragging, draggedWidget } = useCrossGridDrag();

  // Vérifie si CE widget spécifique est en train d'être déplacé (pour l'effet fantôme)
  const isThisWidgetDragging = isDragging && draggedWidget?.id === widget.id;

  return (
    <div
      className={cn(
        "h-full w-full bg-card border rounded-xl shadow-sm relative overflow-hidden transition-all duration-200",
        isThisWidgetDragging ? "opacity-40 scale-95 ring-2 ring-primary ring-offset-2 grayscale" : "hover:shadow-md",
        className
      )}
      style={{
        ...style, // Positionnement absolu géré par la grille
        borderColor: 'var(--border)',
      }}
      // On passe les props d'événements de la grille ici
      {...gridProps}
    >
      <WidgetComponent
        widget={widget}
        isEditMode={isEditMode}
        sourceType={sourceType}
        sourceCategoryId={sourceCategoryId}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      {/* Overlay visuel si en cours de drag (optionnel, pour feedback visuel fort) */}
      {isThisWidgetDragging && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50 backdrop-blur-[1px]">
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/50 animate-pulse">
            En déplacement...
          </div>
        </div>
      )}
    </div>
  );
}