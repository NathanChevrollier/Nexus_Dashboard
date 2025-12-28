"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Widget } from '@/lib/db/schema';

// Définition propre du résultat de drag
export interface DragResult {
  widget: Widget;
  sourceType: 'main' | 'category';
  sourceCategoryId: string | null;
}

interface CrossGridDragState {
  isDragging: boolean;
  draggedWidget: Widget | null;
  sourceType: 'main' | 'category' | null;
  sourceCategoryId: string | null;
  
  // Actions
  startDrag: (widget: Widget, sourceType: 'main' | 'category', sourceCategoryId?: string) => void;
  endDrag: () => DragResult | null;
  cancelDrag: () => void;
}

const CrossGridDragContext = createContext<CrossGridDragState | null>(null);

export function CrossGridDragProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [sourceType, setSourceType] = useState<'main' | 'category' | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState<string | null>(null);

  const startDrag = useCallback((widget: Widget, type: 'main' | 'category', catId?: string) => {
    // On batch les mises à jour pour éviter des re-renders multiples
    setDraggedWidget(widget);
    setSourceType(type);
    setSourceCategoryId(catId || null);
    setIsDragging(true); // On active le flag en dernier
  }, []);

  const endDrag = useCallback((): DragResult | null => {
    if (!draggedWidget || !sourceType) {
      cancelDrag();
      return null;
    }

    const result: DragResult = {
      widget: draggedWidget,
      sourceType,
      sourceCategoryId,
    };

    // Reset state
    setIsDragging(false);
    setDraggedWidget(null);
    setSourceType(null);
    setSourceCategoryId(null);

    return result;
  }, [draggedWidget, sourceType, sourceCategoryId]);

  const cancelDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedWidget(null);
    setSourceType(null);
    setSourceCategoryId(null);
  }, []);

  // Optimisation cruciale : on mémoïse l'objet value pour éviter 
  // que les composants consommateurs ne se re-rendent inutilement.
  const value = useMemo(() => ({
    isDragging,
    draggedWidget,
    sourceType,
    sourceCategoryId,
    startDrag,
    endDrag,
    cancelDrag
  }), [isDragging, draggedWidget, sourceType, sourceCategoryId, startDrag, endDrag, cancelDrag]);

  return (
    <CrossGridDragContext.Provider value={value}>
      {children}
    </CrossGridDragContext.Provider>
  );
}

export function useCrossGridDrag() {
  const context = useContext(CrossGridDragContext);
  if (!context) {
    throw new Error('useCrossGridDrag must be used within CrossGridDragProvider');
  }
  return context;
}