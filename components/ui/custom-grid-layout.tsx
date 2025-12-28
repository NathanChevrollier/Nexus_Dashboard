"use client";

import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';

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
// Vérifie si deux items se chevauchent
function collides(r1: GridItem, r2: GridItem): boolean {
  if (r1.i === r2.i) return false;
  return !(
    r1.x + r1.w <= r2.x ||
    r1.x >= r2.x + r2.w ||
    r1.y + r1.h <= r2.y ||
    r1.y >= r2.y + r2.h
  );
}

// Récupère le premier item qui collisionne
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
  
  // State principal du layout
  const [internalLayout, setInternalLayout] = useState<GridItem[]>(layout);
  
  // State pour l'interaction active
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activity, setActivity] = useState<'drag' | 'resize' | null>(null);
  
  // State pour les calculs de drag (positions brutes en pixels)
  const [dragState, setDragState] = useState<{
    startX: number; startY: number;
    startLeft: number; startTop: number;
    currX: number; currY: number;
    startW: number; startH: number;
  } | null>(null);

  // Le "fantôme" qui montre la future position
  const [placeholder, setPlaceholder] = useState<GridItem | null>(null);

  // Largeur de colonne dynamique
  const colWidth = (width - containerPadding[0] * 2 - margin[0] * (cols - 1)) / cols;

  // Synchro props -> state
  useEffect(() => {
    // On ne met à jour que si on n'est pas en train de manipuler
    if (!activeItem) {
      setInternalLayout(layout);
    }
  }, [layout, activeItem]);

  // --- MOTEUR PHYSIQUE ---

  // Convertit (x, y, w, h) en (top, left, width, height) px
  const getPixelPosition = useCallback((item: GridItem) => {
    return {
      left: Math.round(containerPadding[0] + item.x * (colWidth + margin[0])),
      top: Math.round(containerPadding[1] + item.y * (rowHeight + margin[1])),
      width: Math.round(item.w * colWidth + (item.w - 1) * margin[0]),
      height: Math.round(item.h * rowHeight + (item.h - 1) * margin[1]),
    };
  }, [colWidth, rowHeight, margin, containerPadding]);

  // Convertit des pixels en coordonnées grille
  const getGridPosition = useCallback((left: number, top: number, wPx: number, hPx: number) => {
    const x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
    const y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));
    
    // Calcul de la taille en grille (arrondi au plus proche)
    const w = Math.round((wPx + margin[0]) / (colWidth + margin[0]));
    const h = Math.round((hPx + margin[1]) / (rowHeight + margin[1]));

    return {
      x: Math.max(0, Math.min(cols - w, x)), // Clamp X
      y: Math.max(0, y), // Clamp Y
      w: Math.max(1, w),
      h: Math.max(1, h),
    };
  }, [colWidth, rowHeight, margin, containerPadding, cols]);

  // Algorithme de compaction (Tetris-like)
  const compactLayout = useCallback((layoutItems: GridItem[]): GridItem[] => {
    if (!compactType) return layoutItems;

    // On trie les items pour les traiter du haut vers le bas
    const sorted = [...layoutItems].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    const compacted: GridItem[] = [];

    for (const item of sorted) {
      if (item.static) {
        compacted.push(item);
        continue;
      }

      let newItem = { ...item };
      
      // On essaie de remonter l'item le plus haut possible
      while (newItem.y > 0) {
        const proposed = { ...newItem, y: newItem.y - 1 };
        if (getFirstCollision(compacted, proposed)) {
          break; // Collision trouvée, on arrête de monter
        }
        newItem.y--;
      }
      compacted.push(newItem);
    }

    return compacted;
  }, [compactType]);

  // Déplace un item et pousse les autres
  const moveItem = useCallback((
    layoutToMove: GridItem[],
    itemToMove: GridItem,
    x: number, 
    y: number, 
    isUserAction: boolean
  ): GridItem[] => {
    // Si c'est un resize, on ne bouge pas les coordonnées x/y de l'item, juste w/h géré ailleurs
    // Ici on gère surtout le drag
    
    const layout = layoutToMove.map(l => l.i === itemToMove.i ? { ...l, x, y } : l);
    
    // Si collision interdite, on ne fait rien de complexe
    if (preventCollision) return layout;

    // Logique de "Push" : si je me mets sur un item, il descend
    // On trie par Y pour pousser en cascade
    const collisions = layout.filter(l => l.i !== itemToMove.i && collides(l, { ...itemToMove, x, y }));
    
    for (const collision of collisions) {
      // Résolution simple : on pousse l'élément en conflit vers le bas
      if (collision.static) continue; // On ne peut pas pousser un static

      // On déplace l'élément en conflit juste en dessous
      const newY = y + itemToMove.h;
      // Recursivité : on bouge l'élément en conflit, ce qui peut en pousser d'autres
      // Note : c'est une simplification pour la fluidité, RGL fait plus complexe
      const itemIndex = layout.findIndex(l => l.i === collision.i);
      layout[itemIndex] = { ...collision, y: newY };
    }

    return compactLayout(layout);
  }, [preventCollision, compactLayout]);


  // --- EVENT HANDLERS ---

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'drag' | 'resize') => {
    // 1. Vérifications
    const item = internalLayout.find(l => l.i === id);
    if (!item || item.static) return;
    if (type === 'drag' && !isDraggable) return;
    if (type === 'resize' && !isResizable) return;

    // 2. Gestion Handles
    const target = e.target as HTMLElement;
    if (type === 'drag') {
      const handle = target.closest('.widget-drag-handle') || target.closest('.category-drag-handle');
      if (!handle) return;
      
      // Support Cross-Grid (laisser passer l'event si Ctrl est pressé)
      if (e.ctrlKey || e.metaKey) {
        // On laisse le composant parent (WidgetComponent) gérer le cross-grid
        return; 
      }
    }

    e.preventDefault();
    e.stopPropagation();

    // 3. Init Drag
    const pos = getPixelPosition(item);
    setActiveItem(id);
    setActivity(type);
    setPlaceholder(item);
    
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pos.left,
      startTop: pos.top,
      currX: pos.left,
      currY: pos.top,
      startW: pos.width,
      startH: pos.height,
    });

    // Capture globale
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeItem || !dragState || !containerRef.current) return;

    const item = internalLayout.find(l => l.i === activeItem)!;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // --- AUTO SCROLL ---
    // Si on approche du bas de la fenêtre, on scroll
    if (e.clientY > window.innerHeight - 50) {
      window.scrollBy(0, 10);
    } else if (e.clientY < 50) {
      window.scrollBy(0, -10);
    }

    if (activity === 'drag') {
      const newLeft = dragState.startLeft + deltaX;
      const newTop = dragState.startTop + deltaY;

      setDragState(prev => prev ? ({ ...prev, currX: newLeft, currY: newTop }) : null);

      // Calcul position grille
      const gridPos = getGridPosition(newLeft, newTop, item.w, item.h);
      
      // Si la position a changé, on met à jour le layout interne
      if (gridPos.x !== item.x || gridPos.y !== item.y) {
        const newLayout = moveItem(internalLayout, item, gridPos.x, gridPos.y, true);
        setInternalLayout(newLayout);
        
        // Mise à jour du placeholder
        setPlaceholder({ ...item, x: gridPos.x, y: gridPos.y });
      }
    } 
    else if (activity === 'resize') {
      // Use the original startW/startH (from pointer down) plus delta from the initial pointer
      const newW = Math.max(50, dragState.startW + deltaX);
      const newH = Math.max(50, dragState.startH + deltaY);

      // Do NOT overwrite startW/startH here — they must remain the original dimensions
      // (overwriting caused cumulative deltas and incorrect sizing).

      // Calcul taille grille
      const gridPos = getGridPosition(dragState.startLeft, dragState.startTop, newW, newH);
      
      // Application contraintes
      let w = Math.max(item.minW || 1, gridPos.w);
      let h = Math.max(item.minH || 1, gridPos.h);
      if (item.maxW) w = Math.min(item.maxW, w);
      if (item.maxH) h = Math.min(item.maxH, h);
      
      // Limite colonne
      w = Math.min(w, cols - item.x);

      if (w !== item.w || h !== item.h) {
        // Pour le resize, on modifie directement l'item dans le layout
        const newLayout = internalLayout.map(l => l.i === item.i ? { ...l, w, h } : l);
        // Puis on compacte le reste
        const compacted = compactLayout(newLayout);
        setInternalLayout(compacted);
        
        setPlaceholder({ ...item, w, h });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeItem) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Commit final
    if (placeholder) {
      // On s'assure que le layout final est propre et compacté
      const finalLayout = compactLayout(internalLayout);
      setInternalLayout(finalLayout);
      onLayoutChange?.(finalLayout);
    }

    setActiveItem(null);
    setActivity(null);
    setDragState(null);
    setPlaceholder(null);
  };

  // Hauteur du conteneur basée sur le contenu + marge bas
  const containerHeight = Math.max(
    ...internalLayout.map(i => (i.y + i.h) * (rowHeight + margin[1]))
  ) + containerPadding[1] + 100; // +100px de buffer pour drag a l'aise en bas

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={{
        ...style,
        height: `${Math.max(containerHeight, 200)}px`, // Min height
        width: `${width}px`,
        touchAction: 'none' // Important pour éviter le scroll tactile pendant le drag
      }}
      onPointerMove={activeItem ? handlePointerMove : undefined}
      onPointerUp={activeItem ? handlePointerUp : undefined}
      onPointerLeave={activeItem ? handlePointerUp : undefined} // Sécurité si souris sort
    >
      {/* 1. Placeholder (L'ombre en arrière plan) */}
      {activeItem && placeholder && (
        <div
          className="absolute bg-primary/10 border-2 border-primary/30 border-dashed rounded-xl z-0 transition-all duration-200 ease-out"
          style={{
            ...getPixelPosition(placeholder)
          }}
        />
      )}

      {/* 2. Les Widgets */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        
        const itemKey = child.key as string;
        const item = internalLayout.find(l => l.i === itemKey);
        
        if (!item) return null;

        const isActive = itemKey === activeItem;
        const pixelPos = getPixelPosition(item);

        // Style dynamique
        const itemStyle: React.CSSProperties = {
          position: 'absolute',
          left: pixelPos.left,
          top: pixelPos.top,
          width: pixelPos.width,
          height: pixelPos.height,
          zIndex: isActive ? 50 : 10,
          transition: isActive ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.2s ease, height 0.2s ease', // Belle animation "Spring"
        };

        // Override position si en cours de drag
        if (isActive && activity === 'drag' && dragState) {
          itemStyle.left = dragState.currX;
          itemStyle.top = dragState.currY;
          itemStyle.transform = 'scale(1.02)';
          itemStyle.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
          itemStyle.cursor = 'grabbing';
        }

        // Override size si en cours de resize
        if (isActive && activity === 'resize' && dragState) {
          // Visuellement on garde la taille calculée par le drag de souris pour fluidité
          // Mais le contenu s'adaptera à la grille via le re-render du composant enfant
          // Pour simplifier, on laisse le composant suivre la grille (placeholder) pour l'instant
          // ou on peut faire du vrai resize visuel :
          // itemStyle.width = dragState.startW + (e.clientX - startX)...
        }

        return (
          <div
            key={itemKey}
            style={itemStyle}
            onPointerDown={(e) => handlePointerDown(e, itemKey, 'drag')}
            className={isActive && activity === 'drag' ? 'cursor-grabbing' : ''}
          >
            {child}

            {/* Handle de Resize amélioré */}
            {isResizable && !item.static && (
              <div
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 group/resize flex items-end justify-end p-1.5 touch-none"
                onPointerDown={(e) => handlePointerDown(e, itemKey, 'resize')}
              >
                {/* Indicateur visuel au survol */}
                <div className="w-2 h-2 rounded-sm bg-primary/0 group-hover/resize:bg-primary transition-colors duration-200" />
                {/* Coin SVG subtil */}
                <svg 
                  width="8" height="8" viewBox="0 0 8 8" 
                  className="absolute bottom-1 right-1 text-primary/30 group-hover/resize:text-primary transition-colors"
                  fill="currentColor"
                >
                  <path d="M8 8H0L8 0V8Z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}