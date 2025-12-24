"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Widget } from '@/lib/db/schema';

interface CrossGridDragState {
  isDragging: boolean;
  draggedWidget: Widget | null;
  sourceType: 'main' | 'category' | null;
  sourceCategoryId: string | null;
  startDrag: (widget: Widget, sourceType: 'main' | 'category', sourceCategoryId?: string) => void;
  endDrag: () => { widget: Widget; sourceType: 'main' | 'category'; sourceCategoryId: string | null } | null;
  cancelDrag: () => void;
}

const CrossGridDragContext = createContext<CrossGridDragState | null>(null);

export function CrossGridDragProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [sourceType, setSourceType] = useState<'main' | 'category' | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState<string | null>(null);

  const startDrag = useCallback((widget: Widget, type: 'main' | 'category', catId?: string) => {
    setIsDragging(true);
    setDraggedWidget(widget);
    setSourceType(type);
    setSourceCategoryId(catId || null);
  }, []);

  const endDrag = useCallback(() => {
    if (!draggedWidget || !sourceType) return null;

    const result = {
      widget: draggedWidget,
      sourceType,
      sourceCategoryId,
    };

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

  return (
    <CrossGridDragContext.Provider
      value={{
        isDragging,
        draggedWidget,
        sourceType,
        sourceCategoryId,
        startDrag,
        endDrag,
        cancelDrag,
      }}
    >
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
