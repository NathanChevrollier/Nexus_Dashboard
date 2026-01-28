"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Widget } from '@/lib/db/schema';

interface DragItem {
  widget: Widget;
  sourceType: 'main' | 'category';
  sourceCategoryId?: string;
}

interface CrossGridDragContextType {
  draggingWidget: DragItem | null;
  // Backwards-compatible aliases
  draggedWidget: Widget | null;
  sourceType: 'main' | 'category' | null;
  sourceCategoryId: string | null;
  startDrag: (widget: Widget, sourceType: 'main' | 'category', sourceCategoryId?: string) => void;
  endDrag: () => DragItem | null;
  cancelDrag: () => void;
  isDragging: boolean;
}

const CrossGridDragContext = createContext<CrossGridDragContextType | null>(null);

export function CrossGridDragProvider({ children }: { children: ReactNode }) {
  const [draggingWidget, setDraggingWidget] = useState<DragItem | null>(null);

  const startDrag = useCallback((widget: Widget, sourceType: 'main' | 'category', sourceCategoryId?: string) => {
    setDraggingWidget({ widget, sourceType, sourceCategoryId });
  }, []);

  const endDrag = useCallback(() => {
    const item = draggingWidget;
    setDraggingWidget(null);
    return item;
  }, [draggingWidget]);

  const cancelDrag = useCallback(() => {
    setDraggingWidget(null);
  }, []);

  return (
    <CrossGridDragContext.Provider value={{
      draggingWidget,
      // aliases for older API
      draggedWidget: draggingWidget ? draggingWidget.widget : null,
      sourceType: draggingWidget ? draggingWidget.sourceType : null,
      sourceCategoryId: draggingWidget ? (draggingWidget.sourceCategoryId || null) : null,
      startDrag,
      endDrag,
      cancelDrag,
      isDragging: draggingWidget !== null,
    }}>
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
