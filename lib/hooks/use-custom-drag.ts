"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export interface DragItem {
  id: string;
  type: 'widget' | 'category';
  sourceZone: 'main' | string; // 'main' ou categoryId
  currentX: number;
  currentY: number;
  width: number;
  height: number;
}

export interface DropZone {
  id: string;
  type: 'main' | 'category';
  element: HTMLElement;
  cols: number;
  rowHeight: number;
  cellWidth: number;
}

interface DragState {
  isDragging: boolean;
  dragItem: DragItem | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  ghostX: number;
  ghostY: number;
  targetZone: DropZone | null;
}

export function useCustomDrag() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragItem: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    ghostX: 0,
    ghostY: 0,
    targetZone: null,
  });

  const dropZones = useRef<Map<string, DropZone>>(new Map());

  const registerDropZone = useCallback((zone: DropZone) => {
    dropZones.current.set(zone.id, zone);
    return () => {
      dropZones.current.delete(zone.id);
    };
  }, []);

  const findDropZone = useCallback((x: number, y: number): DropZone | null => {
    for (const [, zone] of dropZones.current) {
      const rect = zone.element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return zone;
      }
    }
    return null;
  }, []);

  const calculateGridPosition = useCallback((
    zone: DropZone,
    mouseX: number,
    mouseY: number,
    itemWidth: number,
    itemHeight: number
  ): { x: number; y: number } => {
    const rect = zone.element.getBoundingClientRect();
    const relativeX = mouseX - rect.left;
    const relativeY = mouseY - rect.top;

    // Calculer la position dans la grille
    const gridX = Math.max(0, Math.min(
      zone.cols - itemWidth,
      Math.round(relativeX / zone.cellWidth)
    ));
    const gridY = Math.max(0, Math.round(relativeY / zone.rowHeight));

    return { x: gridX, y: gridY };
  }, []);

  const startDrag = useCallback((item: DragItem, startX: number, startY: number) => {
    setDragState({
      isDragging: true,
      dragItem: item,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      ghostX: item.currentX,
      ghostY: item.currentY,
      targetZone: null,
    });
  }, []);

  const updateDrag = useCallback((x: number, y: number) => {
    setDragState((prev) => {
      if (!prev.isDragging || !prev.dragItem) return prev;

      const zone = findDropZone(x, y);
      let ghostX = prev.ghostX;
      let ghostY = prev.ghostY;

      if (zone) {
        const pos = calculateGridPosition(zone, x, y, prev.dragItem.width, prev.dragItem.height);
        ghostX = pos.x;
        ghostY = pos.y;
      }

      return {
        ...prev,
        currentX: x,
        currentY: y,
        ghostX,
        ghostY,
        targetZone: zone,
      };
    });
  }, [findDropZone, calculateGridPosition]);

  const endDrag = useCallback((): {
    item: DragItem;
    targetZone: DropZone | null;
    newX: number;
    newY: number;
  } | null => {
    if (!dragState.isDragging || !dragState.dragItem) return null;

    const result = {
      item: dragState.dragItem,
      targetZone: dragState.targetZone,
      newX: dragState.ghostX,
      newY: dragState.ghostY,
    };

    setDragState({
      isDragging: false,
      dragItem: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      ghostX: 0,
      ghostY: 0,
      targetZone: null,
    });

    return result;
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragItem: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      ghostX: 0,
      ghostY: 0,
      targetZone: null,
    });
  }, []);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    registerDropZone,
  };
}
