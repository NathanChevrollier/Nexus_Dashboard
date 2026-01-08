"use client";

import { Category, Widget } from "@/lib/db/schema";
import { ChevronDown, ChevronUp, Trash2, Folder, GripVertical, Plus, LogOut, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { CustomGridLayout, GridItem } from "@/components/ui/custom-grid-layout";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-v2";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CategoryGridItemProps {
  category: Category;
  widgets: Widget[];
  isCollapsed: boolean;
  isEditMode: boolean;
  onToggleCollapse: () => void;
  onCategoryDelete?: (categoryId: string) => void;
  onWidgetEdit: (widget: Widget) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetLayoutChange?: (categoryId: string, layouts: Array<{id: string, x: number, y: number, w: number, h: number}>) => void;
  onWidgetDropIn?: (widgetId: string, categoryId: string) => void;
  onWidgetDropOut?: (widgetId: string) => void;
}

export function CategoryGridItem({
  category,
  widgets,
  isCollapsed,
  isEditMode,
  onToggleCollapse,
  onCategoryDelete,
  onWidgetEdit,
  onWidgetDelete,
  onWidgetLayoutChange,
  onWidgetDropIn,
  onWidgetDropOut,
}: CategoryGridItemProps) {
  const [containerWidth, setContainerWidth] = useState(400);
  const { isDragging, draggedWidget, endDrag, sourceCategoryId } = useCrossGridDrag();
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const COLS = 6;
  const ROW_HEIGHT = 80;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const internalLayout: GridItem[] = widgets.map((widget) => ({
    i: widget.id,
    x: widget.categoryX || 0,
    y: widget.categoryY || 0,
    w: Math.min(widget.w, COLS),
    h: widget.h,
    minW: 1,
    minH: 1,
    static: !isEditMode
  }));

  const handleInternalLayoutChange = (newLayout: GridItem[]) => {
    if (!isEditMode || !onWidgetLayoutChange) return;
    const updates = newLayout.map((item) => ({
      id: item.i, x: item.x, y: item.y, w: item.w, h: item.h,
    }));
    onWidgetLayoutChange(category.id, updates);
  };

  const handleDrop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isDragging || !draggedWidget) return;

    const isExiting = sourceCategoryId === category.id;
    const isEntering = sourceCategoryId !== category.id;

    const result = endDrag();
    if (!result) return;

    if (isEntering) onWidgetDropIn?.(result.widget.id, category.id);
    else if (isExiting) onWidgetDropOut?.(result.widget.id);

    setIsHovered(false);
  };

  const isValidDropTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId !== category.id;
  const isValidExitTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId === category.id;
  const showOverlay = (isValidDropTarget || isValidExitTarget) && isHovered;
  
  const accentColor = category.color || "hsl(var(--primary))";

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full rounded-2xl flex flex-col shadow-sm border bg-card transition-all duration-300 relative overflow-hidden group isolate",
        showOverlay ? "ring-2 ring-primary ring-offset-2 scale-[1.005]" : "hover:shadow-md"
      )}
      style={{
        borderColor: isHovered ? accentColor : undefined,
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      
      {/* ZONE DE DROP (z-index max pour passer au dessus de tout) */}
      {showOverlay && (
        <div 
          className="absolute inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in duration-200 border-2 border-dashed border-primary rounded-2xl cursor-copy"
          onPointerUp={handleDrop}
        >
          <div className="flex flex-col items-center gap-3 p-6 text-center select-none pointer-events-none">
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center shadow-lg transform scale-110", isValidExitTarget ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary")}>
              {isValidExitTarget ? <LogOut className="h-8 w-8" /> : <ArrowDownToLine className="h-8 w-8" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {isValidExitTarget ? "Sortir le widget" : "Déposer ici"}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SOLIDE (z-index élevé pour rester au dessus du contenu) */}
      <div 
        className="flex-none relative flex items-center justify-between px-6 py-4 bg-card z-50 select-none" 
        style={{ 
          background: `linear-gradient(90deg, ${accentColor}08 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-center gap-5 min-w-0 flex-1">
          {isEditMode && (
            <div 
              className="category-drag-handle cursor-grab active:cursor-grabbing p-2.5 rounded-xl hover:bg-background/80 text-muted-foreground/50 hover:text-foreground transition-all hover:scale-110 shadow-sm border border-transparent hover:border-border/50"
              onPointerUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                // Ensure pointerdown targets the handle element so the grid's handler
                // can reliably detect the handle (fixes inconsistent drag starts).
                // Do NOT stop propagation.
              }}
            >
              <GripVertical className="h-6 w-6" />
            </div>
          )}

          <div 
            className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border border-white/10 text-3xl transition-transform duration-300 group-hover:scale-105 shrink-0 bg-background"
            style={{ 
              color: accentColor,
              boxShadow: `0 4px 12px ${accentColor}15`
            }}
          >
            {category.icon || <Folder className="h-7 w-7" />}
          </div>

          <div className="flex flex-col justify-center min-w-0 h-full py-0.5">
            <h3 className="font-bold text-xl text-foreground/90 truncate leading-none tracking-tight mb-1.5">
              {category.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2 w-2 rounded-full", isCollapsed ? "bg-muted-foreground/30" : "bg-emerald-500 animate-pulse")} />
              <span className="text-sm font-medium text-muted-foreground/70 leading-none">
                {widgets.length} {widgets.length > 1 ? "éléments" : "élément"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-4 z-30">
          {isEditMode && onCategoryDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
              onClick={(e) => { e.stopPropagation(); onCategoryDelete(category.id); }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-background/50 hover:bg-background border border-border/20 hover:border-border/50 shadow-sm transition-all hover:scale-110"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          >
            {isCollapsed ? <ChevronDown className="h-6 w-6 text-muted-foreground" /> : <ChevronUp className="h-6 w-6 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* SÉPARATEUR EXPLICITE (La barre bleue) */}
      {/* On la sort du header pour éviter les glitchs visuels */}
      <div className="w-full h-[1px] relative z-40" style={{ backgroundColor: `${accentColor}30` }} />

      {/* CONTENU (z-index bas pour passer dessous) */}
      <div 
        className={cn(
          "flex-1 relative transition-all duration-300 bg-background/30 w-full overflow-auto z-0", 
          isCollapsed ? "hidden" : "block"
        )}
      >
        {widgets.length > 0 ? (
          <div className="p-4 h-full w-full relative">
            <CustomGridLayout
              layout={internalLayout}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              width={containerWidth - 32}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              compactType="vertical"
              preventCollision={true}
              onLayoutChange={handleInternalLayoutChange}
              margin={[16, 16]}
              containerPadding={[0, 0]}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="h-full w-full">
                  <WidgetComponent
                    widget={widget}
                    isEditMode={isEditMode}
                    sourceType="category"
                    sourceCategoryId={category.id}
                    onEdit={() => onWidgetEdit(widget)}
                    onDelete={() => onWidgetDelete(widget.id)}
                  />
                </div>
              ))}
            </CustomGridLayout>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-muted/20 m-4 rounded-2xl bg-muted/5 transition-colors hover:bg-muted/10">
            <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
               <Plus className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium">Glissez un widget ici pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}