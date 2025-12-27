"use client";

import React, { useRef, useEffect, useState, ReactElement, ReactNode } from 'react';

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
  children: ReactNode;
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
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [placeholder, setPlaceholder] = useState<GridItem | null>(null);
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });

  const colWidth = (width - containerPadding[0] * 2 - margin[0] * (cols - 1)) / cols;

  useEffect(() => {
    setInternalLayout(layout);
  }, [layout]);

  // Calculer la position pixel à partir des coordonnées de grille
  const getPixelPosition = (item: GridItem) => {
    return {
      left: containerPadding[0] + item.x * (colWidth + margin[0]),
      top: containerPadding[1] + item.y * (rowHeight + margin[1]),
      width: item.w * colWidth + (item.w - 1) * margin[0],
      height: item.h * rowHeight + (item.h - 1) * margin[1],
    };
  };

  // Calculer les coordonnées de grille à partir de la position pixel
  const getGridPosition = (pixelX: number, pixelY: number, itemW: number, itemH: number) => {
    const x = Math.round((pixelX - containerPadding[0]) / (colWidth + margin[0]));
    const y = Math.round((pixelY - containerPadding[1]) / (rowHeight + margin[1]));
    
    return {
      x: Math.max(0, Math.min(cols - itemW, x)),
      y: Math.max(0, y),
    };
  };

  // Vérifier les collisions
  const checkCollision = (item: GridItem, layout: GridItem[]): boolean => {
    return layout.some(layoutItem => {
      if (layoutItem.i === item.i) return false;
      return !(
        item.x + item.w <= layoutItem.x ||
        item.x >= layoutItem.x + layoutItem.w ||
        item.y + item.h <= layoutItem.y ||
        item.y >= layoutItem.y + layoutItem.h
      );
    });
  };

  // Compacter la grille
  const compactLayout = (layout: GridItem[]): GridItem[] => {
    if (!compactType) return layout;

    const sorted = [...layout].sort((a, b) => {
      if (compactType === 'vertical') {
        return a.y - b.y || a.x - b.x;
      }
      return a.x - b.x || a.y - b.y;
    });

    const compacted: GridItem[] = [];

    sorted.forEach(item => {
      if (item.static) {
        compacted.push(item);
        return;
      }

      let newY = item.y;
      if (compactType === 'vertical') {
        while (newY > 0) {
          const testItem = { ...item, y: newY - 1 };
          if (checkCollision(testItem, compacted)) break;
          newY--;
        }
      }

      compacted.push({ ...item, y: newY });
    });

    return compacted;
  };

  // Gérer le début du drag
  const handleDragStart = (itemId: string, e: React.PointerEvent) => {
    if (!isDraggable) return;
    
    const item = internalLayout.find(l => l.i === itemId);
    if (!item || item.static) return;

    // IMPORTANT : Seulement permettre le drag si on clique sur la poignée de drag
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.widget-drag-handle') || target.closest('.category-drag-handle');
    
    if (!isDragHandle) return; // Ignorer si ce n'est pas la poignée

    // Si Ctrl ou Cmd est pressé, déclencher le cross-grid drag via un attribut data
    if (e.ctrlKey || e.metaKey) {
      const widgetElement = e.currentTarget as HTMLElement;
      widgetElement.dataset.crossGridDrag = 'true';
      return; // Empêcher le drag normal
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();

    setDraggingItem(itemId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragPosition({
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
    });

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Gérer le mouvement pendant le drag
  const handleDragMove = (e: React.PointerEvent) => {
    if (!draggingItem || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;

    setDragPosition({ x: newX, y: newY });

    // Calculer la nouvelle position dans la grille
    const item = internalLayout.find(l => l.i === draggingItem)!;
    const gridPos = getGridPosition(newX, newY, item.w, item.h);

    const newItem = { ...item, x: gridPos.x, y: gridPos.y };

    // Vérifier les collisions et déplacer les autres widgets dynamiquement
    if (preventCollision) {
      const otherItems = internalLayout.filter(l => l.i !== draggingItem);
      if (checkCollision(newItem, otherItems)) {
        // Trouver la position libre la plus proche
        let testY = gridPos.y;
        let found = false;
        
        // Essayer de déplacer vers le bas
        while (testY < 100 && !found) {
          const testItem = { ...newItem, y: testY };
          if (!checkCollision(testItem, otherItems)) {
            newItem.y = testY;
            found = true;
            break;
          }
          testY++;
        }
        
        if (!found) {
          return; // Pas de position valide trouvée
        }
      }

      // Mettre à jour temporairement le layout pour pousser les autres widgets
      const tempLayout = internalLayout.map(l => l.i === draggingItem ? newItem : l);
      const compactedLayout = compactLayout(tempLayout);
      setInternalLayout(compactedLayout);
    }

    setPlaceholder(newItem);
  };

  // Gérer la fin du drag
  const handleDragEnd = (e: React.PointerEvent) => {
    if (!draggingItem) return;

    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (placeholder) {
      const newLayout = internalLayout.map(item => 
        item.i === draggingItem ? placeholder : item
      );

      const compactedLayout = compactLayout(newLayout);
      setInternalLayout(compactedLayout);
      onLayoutChange?.(compactedLayout);
    }

    setDraggingItem(null);
    setPlaceholder(null);
  };

  // Gérer le resize
  const handleResizeStart = (itemId: string, e: React.PointerEvent) => {
    if (!isResizable) return;
    
    const item = internalLayout.find(l => l.i === itemId);
    if (!item || item.static) return;

    e.preventDefault();
    e.stopPropagation();

    setResizingItem(itemId);
    setResizeStart({
      w: item.w,
      h: item.h,
      x: e.clientX,
      y: e.clientY,
    });

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizingItem || !containerRef.current) return;

    const item = internalLayout.find(l => l.i === resizingItem)!;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const colsDelta = Math.round(deltaX / (colWidth + margin[0]));
    const rowsDelta = Math.round(deltaY / (rowHeight + margin[1]));

    let newW = Math.max(item.minW || 1, resizeStart.w + colsDelta);
    let newH = Math.max(item.minH || 1, resizeStart.h + rowsDelta);

    if (item.maxW) newW = Math.min(newW, item.maxW);
    if (item.maxH) newH = Math.min(newH, item.maxH);

    newW = Math.min(newW, cols - item.x);

    let newItem = { ...item, w: newW, h: newH };

    // Éviter les collisions pendant le resize si demandé
    if (preventCollision) {
      const otherItems = internalLayout.filter((l) => l.i !== item.i);
      let safeY = newItem.y;

      while (safeY < 200) {
        const testItem = { ...newItem, y: safeY };
        if (!checkCollision(testItem, otherItems)) {
          newItem = testItem;
          break;
        }
        safeY++;
      }
    }

    setPlaceholder(newItem);
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!resizingItem) return;

    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (placeholder) {
      const newLayout = internalLayout.map(item => 
        item.i === resizingItem ? placeholder : item
      );

      const compactedLayout = compactLayout(newLayout);
      setInternalLayout(compactedLayout);
      onLayoutChange?.(compactedLayout);
    }

    setResizingItem(null);
    setPlaceholder(null);
  };

  // Calculer la hauteur du conteneur
  const containerHeight = Math.max(
    ...internalLayout.map(item => item.y + item.h)
  ) * (rowHeight + margin[1]) + containerPadding[1] * 2;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        ...style,
        height: `${containerHeight}px`,
        width: `${width}px`,
      }}
    >
      {/* Placeholder pour montrer où l'item va être déposé */}
      {placeholder && (draggingItem || resizingItem) && (
        <div
          className="absolute bg-primary/10 border-2 border-primary border-dashed rounded-lg pointer-events-none animate-pulse"
          style={{
            ...getPixelPosition(placeholder),
            zIndex: 1,
            boxShadow: '0 0 20px rgba(var(--primary-rgb), 0.3)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 rounded-lg" />
        </div>
      )}

      {/* Render des items */}
      {React.Children.map(children, (child) => {
        if (!child || typeof child === 'string' || typeof child === 'number' || !React.isValidElement(child)) {
          return null;
        }

        const itemId = child.key as string;
        const item = internalLayout.find(l => l.i === itemId);
        
        if (!item) return null;

        const pixelPos = getPixelPosition(item);
        const isDragging = draggingItem === itemId;
        const isResizing = resizingItem === itemId;
        const isActive = isDragging || isResizing;

        return (
          <div
            className={`absolute ${isActive ? 'z-50' : 'z-10'}`}
            style={{
              ...(!isActive ? pixelPos : {
                left: `${isResizing ? pixelPos.left : dragPosition.x}px`,
                top: `${isResizing ? pixelPos.top : dragPosition.y}px`,
                width: `${placeholder?.i === itemId && placeholder ? 
                  placeholder.w * colWidth + (placeholder.w - 1) * margin[0] : 
                  pixelPos.width}px`,
                height: `${placeholder?.i === itemId && placeholder ? 
                  placeholder.h * rowHeight + (placeholder.h - 1) * margin[1] : 
                  pixelPos.height}px`,
              }),
              opacity: isActive ? 0.9 : 1,
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
              transition: isActive ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: isDragging ? 'grabbing' : (isResizing ? 'nwse-resize' : 'default'),
              pointerEvents: 'auto',
            }}
            onPointerDown={(e) => !isResizing && handleDragStart(itemId, e)}
            onPointerMove={draggingItem === itemId ? handleDragMove : (resizingItem === itemId ? handleResizeMove : undefined)}
            onPointerUp={draggingItem === itemId ? handleDragEnd : (resizingItem === itemId ? handleResizeEnd : undefined)}
            onPointerCancel={draggingItem === itemId ? handleDragEnd : (resizingItem === itemId ? handleResizeEnd : undefined)}
          >
            {child}
            
            {/* Handle de resize */}
            {isResizable && !item.static && !isDragging && (
              <div
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-20 group/resize"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleResizeStart(itemId, e);
                }}
                onPointerMove={resizingItem === itemId ? handleResizeMove : undefined}
                onPointerUp={resizingItem === itemId ? handleResizeEnd : undefined}
                onPointerCancel={resizingItem === itemId ? handleResizeEnd : undefined}
              >
                <svg 
                  className="absolute bottom-0 right-0 w-5 h-5 text-primary/40 group-hover/resize:text-primary transition-colors" 
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M20 20 L20 14 L14 20 Z" />
                  <path d="M20 20 L20 8 L8 20 Z" opacity="0.6" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
