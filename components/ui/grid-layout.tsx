"use client";

import React, { useEffect, useState, useRef } from 'react';
import RGL, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Some versions of react-grid-layout no longer export WidthProvider.
// Implement a lightweight width-provider fallback by measuring the container
// and passing the measured `width` prop to the grid when one isn't supplied.
const ReactGridLayout = RGL as any;

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
  width,
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | undefined>(width);

  // Fix pour l'hydratation Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure container width when width prop isn't provided
  useEffect(() => {
    if (width) {
      setMeasuredWidth(width);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => setMeasuredWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  // Rendu simplifié côté serveur pour éviter le layout shift
  if (!mounted) {
    return (
      <div className={className} style={{ position: 'relative' }}>
        {children}
      </div>
    );
  }

  // Use measuredWidth when no explicit width prop provided
  const resolvedWidth = width ?? measuredWidth;

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      <ReactGridLayout
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
        width={resolvedWidth}
        // Pass other props through
        {...props}
      >
        {children}
      </ReactGridLayout>
    </div>
  );
}