"use client";

import React, { useEffect, useState } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Ajout du WidthProvider pour rendre la grille responsive automatiquement
const ReactGridLayout = WidthProvider(RGL);

export interface AppGridLayoutProps {
  className?: string;
  layout: Layout[];
  cols?: number;
  rowHeight?: number;
  width?: number; // Optionnel maintenant grâce au WidthProvider
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  draggableHandle?: string;
  draggableCancel?: string;
  margin?: [number, number];
  containerPadding?: [number, number];
  children: React.ReactNode;
}

export default function GridLayout({
  className = "layout",
  layout,
  cols = 12,
  rowHeight = 80,
  isDraggable = true,
  isResizable = true,
  compactType = 'vertical',
  preventCollision = false,
  onLayoutChange,
  draggableHandle = ".widget-drag-handle", // Défaut utile
  draggableCancel = ".widget-no-drag", // Défaut utile
  margin = [10, 10],
  containerPadding = [10, 10],
  children,
  ...props
}: AppGridLayoutProps) {
  const [mounted, setMounted] = useState(false);

  // Fix pour l'hydratation Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  // Rendu simplifié côté serveur pour éviter le layout shift
  if (!mounted) {
    return (
      <div className={className} style={{ position: 'relative' }}>
        {children}
      </div>
    );
  }

  return (
    <ReactGridLayout
      className={className}
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      isDraggable={isDraggable}
      isResizable={isResizable}
      compactType={compactType}
      preventCollision={preventCollision}
      onLayoutChange={onLayoutChange}
      draggableHandle={draggableHandle}
      draggableCancel={draggableCancel}
      margin={margin}
      containerPadding={containerPadding}
      // Props passées (comme width si fourni manuellement)
      {...props} 
    >
      {children}
    </ReactGridLayout>
  );
}