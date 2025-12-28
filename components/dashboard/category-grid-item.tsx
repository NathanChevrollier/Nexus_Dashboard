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
  const [isHovered, setIsHovered] = useState(false); // État de survol global
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

  // --- LOGIQUE DE DROP ---
  const handleDrop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isDragging || !draggedWidget) return;

    // IMPORTANT : On vérifie l'action AVANT de terminer le drag
    const isExiting = sourceCategoryId === category.id;
    const isEntering = sourceCategoryId !== category.id;

    const result = endDrag();
    if (!result) return;

    if (isEntering) {
      onWidgetDropIn?.(result.widget.id, category.id);
    } else if (isExiting) {
      onWidgetDropOut?.(result.widget.id);
    }

    setIsHovered(false);
  };

  // --- CONDITIONS D'AFFICHAGE ---
  const isValidDropTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId !== category.id;
  const isValidExitTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId === category.id;
  const showOverlay = (isValidDropTarget || isValidExitTarget) && isHovered;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-full w-full rounded-xl flex flex-col shadow-sm border transition-all duration-300 relative overflow-hidden group",
        isHovered && (isValidDropTarget || isValidExitTarget) ? "ring-2 ring-primary ring-offset-2 scale-[1.01]" : "hover:shadow-md"
      )}
      style={{
        background: category.color 
          ? `linear-gradient(145deg, ${category.color}05 0%, ${category.color}15 100%)`
          : 'var(--card)',
        borderColor: category.color ? `${category.color}40` : 'var(--border)',
      }}
      // Détection de survol globale sur le conteneur
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      
      {/* --- OVERLAY DE DROP (ZONE GÉANTE) --- */}
      {/* Cet overlay couvre tout et capture explicitement le pointerUp */}
      {(isValidDropTarget || isValidExitTarget) && (
        <div 
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200 border-2 border-dashed rounded-xl cursor-copy",
            isHovered 
              ? "opacity-100 border-primary bg-primary/5 pointer-events-auto" // ACTIVE
              : "opacity-0 pointer-events-none" // INACTIVE
          )}
          // C'est ICI que la magie opère : on écoute le drop sur l'overlay lui-même
          onPointerUp={handleDrop}
        >
          <div className="flex flex-col items-center gap-3 p-6 text-center animate-in zoom-in-95 duration-200 select-none">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-colors",
              isValidExitTarget ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary"
            )}>
              {isValidExitTarget ? <LogOut className="h-8 w-8 ml-1" /> : <ArrowDownToLine className="h-8 w-8" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isValidExitTarget ? "Sortir de la catégorie" : "Déposer ici"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isValidExitTarget 
                  ? "Relâchez pour renvoyer vers la grille principale" 
                  : `Ajouter à "${category.name}"`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20"
        style={{ borderBottomColor: category.color ? `${category.color}20` : 'var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditMode && (
            <div 
              className="category-drag-handle cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
              onPointerUp={(e) => e.stopPropagation()} // Empêche le drop involontaire si on clique juste
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0 filter drop-shadow-sm">{category.icon || <Folder className="h-4 w-4 text-primary" />}</span>
            <span className="font-semibold text-sm truncate">{category.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-mono">
              {widgets.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pl-2 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          
          {isEditMode && onCategoryDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onCategoryDelete(category.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className={cn("flex-1 relative transition-all duration-300", isCollapsed ? "h-0 overflow-hidden" : "h-auto")}>
        {widgets.length > 0 ? (
          <div className="p-2 h-full overflow-hidden">
            <CustomGridLayout
              layout={internalLayout}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              width={containerWidth}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              compactType="vertical"
              preventCollision={true}
              onLayoutChange={handleInternalLayoutChange}
              margin={[10, 10]}
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
          !isCollapsed && (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-muted/20 m-2 rounded-lg bg-muted/5">
              <Plus className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Glissez un widget ici</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}