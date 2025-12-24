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
  startDrag: (widget: Widget, sourceType: 'main' | 'category', sourceCategoryId?: string) => void;
  endDrag: () => DragItem | null;
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

  return (
    <CrossGridDragContext.Provider value={{
      draggingWidget,
      startDrag,
      endDrag,
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
