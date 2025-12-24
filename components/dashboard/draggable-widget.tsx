"use client";

import { Widget } from "@/lib/db/schema";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-context";
import { useState } from "react";

interface DraggableWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  sourceType: 'main' | 'category';
  sourceCategoryId?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function DraggableWidget({
  widget,
  isEditMode,
  sourceType,
  sourceCategoryId,
  onEdit,
  onDelete,
}: DraggableWidgetProps) {
  const { startDrag, isDragging, draggingWidget } = useCrossGridDrag();
  const [isHoldingForDrag, setIsHoldingForDrag] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

  const isThisWidgetDragging = isDragging && draggingWidget?.widget.id === widget.id;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditMode) return;

    // Démarrer un timer pour le hold-to-drag
    const timer = setTimeout(() => {
      setIsHoldingForDrag(true);
      startDrag(widget, sourceType, sourceCategoryId);
    }, 200); // 200ms pour activer le drag cross-grid

    setHoldTimer(timer);
  };

  const handlePointerUp = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
    setIsHoldingForDrag(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Si on bouge avant les 200ms, annuler le timer
    if (holdTimer && !isHoldingForDrag) {
      const moveDistance = 5; // pixels
      if (Math.abs(e.movementX) > moveDistance || Math.abs(e.movementY) > moveDistance) {
        clearTimeout(holdTimer);
        setHoldTimer(null);
      }
    }
  };

  return (
    <div
      className={`h-full w-full bg-card border-2 rounded-lg shadow-sm relative overflow-hidden transition-all ${
        isThisWidgetDragging ? 'opacity-50 scale-95' : ''
      }`}
      style={{
        borderColor: 'hsl(var(--border))',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerUp}
    >
      <WidgetComponent
        widget={widget}
        isEditMode={isEditMode}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      {isHoldingForDrag && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg flex items-center justify-center z-50">
          <span className="text-sm font-medium text-primary">Déplacement vers catégorie...</span>
        </div>
      )}
    </div>
  );
}
