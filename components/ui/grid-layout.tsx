import React from 'react';
import RGL from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';

const ReactGridLayout: any = RGL;

export interface AppGridLayoutProps {
  className?: string;
  // react-grid-layout Layout is an array of LayoutItem
  layout: Layout;
  cols?: number;
  rowHeight?: number;
  width?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  onLayoutChange?: (layout: Layout) => void;
  draggableHandle?: string;
  draggableCancel?: string;
  children: React.ReactNode;
}

export default function GridLayout({
  className = "layout",
  layout,
  cols = 12,
  rowHeight = 80,
  width = 1200,
  isDraggable = true,
  isResizable = true,
  compactType = 'vertical',
  preventCollision = false,
  onLayoutChange,
  draggableHandle,
  draggableCancel,
  children,
}: AppGridLayoutProps) {
  return (
    <ReactGridLayout
      className={className}
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      width={width}
      isDraggable={isDraggable}
      isResizable={isResizable}
      compactType={compactType}
      preventCollision={preventCollision}
      onLayoutChange={onLayoutChange}
      draggableHandle={draggableHandle}
      draggableCancel={draggableCancel}
    >
      {children}
    </ReactGridLayout>
  );
}
