"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- TYPES ---
export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

interface CustomGridLayoutProps {
  children: React.ReactNode;
  layout: GridItem[];
  cols: number;
  rowHeight: number;
  width: number;
  onLayoutChange?: (layout: GridItem[]) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  margin?: [number, number];
  containerPadding?: [number, number];
  className?: string;
  style?: React.CSSProperties;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
}

// --- UTILS ---
function collides(r1: GridItem, r2: GridItem): boolean {
  if (r1.i === r2.i) return false; // Un item ne collisionne pas avec lui-même
  return !(
    r1.x + r1.w <= r2.x ||
    r1.x >= r2.x + r2.w ||
    r1.y + r1.h <= r2.y ||
    r1.y >= r2.y + r2.h
  );
}

function getFirstCollision(layout: GridItem[], item: GridItem): GridItem | undefined {
  return layout.find((l) => collides(l, item));
}

// --- COMPONENT ---
export function CustomGridLayout({
  children,
  layout,
  cols,
  rowHeight,
  width,
  onLayoutChange,
  isDraggable = true,
  isResizable = false,
  margin = [10, 10],
  containerPadding = [0, 0],
  className = '',
  style = {},
  compactType = 'vertical',
  preventCollision = false,
}: CustomGridLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalLayout, setInternalLayout] = useState<GridItem[]>(layout);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activity, setActivity] = useState<'drag' | 'resize' | null>(null);
  const [dragState, setDragState] = useState<{
    startX: number; startY: number;
    startLeft: number; startTop: number;
    currX: number; currY: number;
    startW: number; startH: number;
    pointerId?: number;
  } | null>(null);
  const pointerCaptureRef = useRef<HTMLElement | null>(null);
  const [placeholder, setPlaceholder] = useState<GridItem | null>(null);

  const colWidth = (width - containerPadding[0] * 2 - margin[0] * (cols - 1)) / cols;

  // --- ALGORITHME DE COMPACTION (LE CŒUR DU SYSTÈME) ---
  const compactLayout = useCallback((layoutItems: GridItem[]): GridItem[] => {
    // 1. On trie les items du haut vers le bas.
    const sorted = [...layoutItems].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    const compacted: GridItem[] = [];

    for (const item of sorted) {
      let newItem = { ...item };

      // 2. PHASE DE POUSSÉE (Collision Resolution)
      while (getFirstCollision(compacted, newItem)) {
        newItem.y++;
      }

      // 3. PHASE DE GRAVITÉ (Si activée)
      if (compactType === 'vertical') {
        while (newItem.y > 0) {
          const proposed = { ...newItem, y: newItem.y - 1 };
          if (getFirstCollision(compacted, proposed)) {
            break; 
          }
          newItem.y--;
        }
      }

      compacted.push(newItem);
    }

    return compacted;
  }, [compactType]);

  // --- SYNCHRONISATION ---
  useEffect(() => {
    if (!activeItem) {
      const newLayout = compactLayout(layout);
      if (JSON.stringify(newLayout) !== JSON.stringify(internalLayout)) {
        setInternalLayout(newLayout);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, activeItem, compactLayout]); 

  // --- HELPERS ---

  const getPixelPosition = useCallback((item: GridItem) => {
    return {
      left: Math.round(containerPadding[0] + item.x * (colWidth + margin[0])),
      top: Math.round(containerPadding[1] + item.y * (rowHeight + margin[1])),
      width: Math.round(item.w * colWidth + (item.w - 1) * margin[0]),
      height: Math.round(item.h * rowHeight + (item.h - 1) * margin[1]),
    };
  }, [colWidth, rowHeight, margin, containerPadding]);

  const getGridPosition = useCallback((left: number, top: number, wPx: number, hPx: number) => {
    const x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
    const y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));
    
    const w = Math.round((wPx + margin[0]) / (colWidth + margin[0]));
    const h = Math.round((hPx + margin[1]) / (rowHeight + margin[1]));

    return {
      x: Math.max(0, Math.min(cols - w, x)), 
      y: Math.max(0, y), 
      w: Math.max(1, w),
      h: Math.max(1, h),
    };
  }, [colWidth, rowHeight, margin, containerPadding, cols]);

  const moveItem = useCallback((layoutToMove: GridItem[], itemToMove: GridItem, x: number, y: number): GridItem[] => {
    const layout = layoutToMove.map(l => l.i === itemToMove.i ? { ...l, x, y } : l);
    if (preventCollision) return layout;
    
    const collisions = layout.filter(l => l.i !== itemToMove.i && collides(l, { ...itemToMove, x, y }));
    for (const collision of collisions) {
      if (collision.static) continue; 
      const newY = y + itemToMove.h;
      const itemIndex = layout.findIndex(l => l.i === collision.i);
      layout[itemIndex] = { ...collision, y: newY };
    }
    return compactLayout(layout);
  }, [preventCollision, compactLayout]);

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'drag' | 'resize') => {
    const item = internalLayout.find(l => l.i === id);
    if (!item || item.static) return;
    if (type === 'drag' && !isDraggable) return;
    if (type === 'resize' && !isResizable) return;

    const target = e.target as HTMLElement;
    if (type === 'drag') {
      // Robust handle detection
      let handle = target.closest('.widget-drag-handle') || target.closest('.category-drag-handle');
      if (!handle) {
        const path = (e.nativeEvent as any)?.composedPath?.() as EventTarget[] | undefined;
        if (path && Array.isArray(path)) {
          for (const node of path) {
            try {
              const el = node as HTMLElement;
              if (el?.classList?.contains('widget-drag-handle') || el?.classList?.contains('category-drag-handle')) {
                handle = el;
                break;
              }
            } catch (err) {
              // ignore non-HTMLElements
            }
          }
        }
      }
      if (!handle) return;
      if (e.ctrlKey || e.metaKey) return; 
    }

    e.preventDefault();
    e.stopPropagation();

    const pos = getPixelPosition(item);
    setActiveItem(id);
    setActivity(type);
    setPlaceholder(item);
    setDragState({ startX: e.clientX, startY: e.clientY, startLeft: pos.left, startTop: pos.top, currX: pos.left, currY: pos.top, startW: pos.width, startH: pos.height, pointerId: e.pointerId });
    
    // --- CORRECTION MAJEURE ICI ---
    // On capture le pointeur sur le CONTENEUR parent, pas sur l'élément enfant qui bouge.
    // Cela garantit que l'événement "pointerUp" sera reçu même si l'élément enfant change/bouge.
    try {
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
        pointerCaptureRef.current = containerRef.current;
      }
    } catch (err) {
      console.warn("Failed to capture pointer", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeItem || !dragState || !containerRef.current) return;
    const item = internalLayout.find(l => l.i === activeItem)!;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // Auto-scroll
    if (e.clientY > window.innerHeight - 50) window.scrollBy(0, 10);
    else if (e.clientY < 50) window.scrollBy(0, -10);

    if (activity === 'drag') {
      const newLeft = dragState.startLeft + deltaX;
      const newTop = dragState.startTop + deltaY;
      setDragState((prev: any) => ({ ...prev, currX: newLeft, currY: newTop }));
      const gridPos = getGridPosition(newLeft, newTop, item.w, item.h);
      if (gridPos.x !== item.x || gridPos.y !== item.y) {
        const newLayout = moveItem(internalLayout, item, gridPos.x, gridPos.y);
        setInternalLayout(newLayout);
        setPlaceholder({ ...item, x: gridPos.x, y: gridPos.y });
      }
    } else if (activity === 'resize') {
      const newW = Math.max(50, dragState.startW + deltaX);
      const newH = Math.max(50, dragState.startH + deltaY);
      const gridPos = getGridPosition(dragState.startLeft, dragState.startTop, newW, newH);
      let w = Math.max(item.minW || 1, gridPos.w);
      let h = Math.max(item.minH || 1, gridPos.h);
      if (item.maxW) w = Math.min(item.maxW, w);
      if (item.maxH) h = Math.min(item.maxH, h);
      w = Math.min(w, cols - item.x);

      if (w !== item.w || h !== item.h) {
        const newLayout = internalLayout.map(l => l.i === item.i ? { ...l, w, h } : l);
        const compacted = compactLayout(newLayout);
        setInternalLayout(compacted);
        setPlaceholder({ ...item, w, h });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeItem) return;
    
    // Release pointer capture
    try {
      if (pointerCaptureRef.current && dragState?.pointerId !== undefined) {
        pointerCaptureRef.current.releasePointerCapture(dragState.pointerId);
      }
    } catch (err) {
      // ignore
    }

    if (placeholder) {
      const finalLayout = compactLayout(internalLayout);
      setInternalLayout(finalLayout);
      onLayoutChange?.(finalLayout);
    }
    setActiveItem(null);
    setActivity(null);
    setDragState(null);
    setPlaceholder(null);
    pointerCaptureRef.current = null;
  };

  const containerHeight = Math.max(
    ...internalLayout.map(i => (i.y + i.h) * (rowHeight + margin[1]))
  ) + containerPadding[1] + 100;

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={{ ...style, height: `${Math.max(containerHeight, 200)}px`, width: `${width}px`, touchAction: 'none' }}
      onPointerMove={activeItem ? handlePointerMove : undefined}
      onPointerUp={activeItem ? handlePointerUp : undefined}
      // CORRECTION : Suppression de onPointerLeave pour éviter les drops intempestifs
    >
      {activeItem && placeholder && (
        <div className="absolute bg-primary/10 border-2 border-primary/30 border-dashed rounded-xl z-0 transition-all duration-200 ease-out"
          style={{ ...getPixelPosition(placeholder) }} />
      )}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        const itemKey = child.key as string;
        const item = internalLayout.find(l => l.i === itemKey);
        if (!item) return null;
        const isActive = itemKey === activeItem;
        const pixelPos = getPixelPosition(item);
        const itemStyle: React.CSSProperties = {
          position: 'absolute',
          left: pixelPos.left, top: pixelPos.top, width: pixelPos.width, height: pixelPos.height,
          zIndex: isActive ? 50 : 10,
          transition: isActive ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s ease, height 0.3s ease',
        };
        if (isActive && activity === 'drag' && dragState) {
          itemStyle.left = dragState.currX;
          itemStyle.top = dragState.currY;
          itemStyle.transform = 'scale(1.02)';
          itemStyle.cursor = 'grabbing';
        }
        return (
          <div key={itemKey} style={itemStyle} onPointerDown={(e) => handlePointerDown(e, itemKey, 'drag')} className={isActive && activity === 'drag' ? 'cursor-grabbing' : ''}>
            {child}
            {isResizable && !item.static && (
              <div className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 group/resize flex items-end justify-end p-1.5 touch-none" onPointerDown={(e) => handlePointerDown(e, itemKey, 'resize')}>
                <div className="w-2 h-2 rounded-sm bg-primary/0 group-hover/resize:bg-primary transition-colors duration-200" />
                <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-1 right-1 text-primary/30 group-hover/resize:text-primary transition-colors" fill="currentColor"><path d="M8 8H0L8 0V8Z" /></svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}