"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useCustomDrag, DragItem, DropZone } from '@/lib/hooks/use-custom-drag';

interface DragContextValue {
  dragState: ReturnType<typeof useCustomDrag>['dragState'];
  startDrag: (item: DragItem, startX: number, startY: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => ReturnType<typeof useCustomDrag>['endDrag'] extends () => infer R ? R : never;
  cancelDrag: () => void;
  registerDropZone: (zone: DropZone) => () => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const dragUtils = useCustomDrag();

  return (
    <DragContext.Provider value={dragUtils}>
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
}
