"use client";

import { Category, Widget } from "@/lib/db/schema";
import { ChevronDown, ChevronUp, Trash2, Folder, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { CustomGridLayout, GridItem } from "@/components/ui/custom-grid-layout";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-v2";
import { useState, useEffect, useRef } from "react";

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
  const { isDragging, draggedWidget, sourceType, sourceCategoryId, endDrag, cancelDrag } = useCrossGridDrag();
  const [isDropZoneHovered, setIsDropZoneHovered] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const COLS = 6;
  const ROW_HEIGHT = 60;

  // Calculer la largeur du conteneur pour la grille interne
  useEffect(() => {
    const updateWidth = () => {
      const categoryColSpan = category.w || 4;
      const totalWidth = window.innerWidth - 48;
      const columnWidth = totalWidth / 12;
      const availableWidth = (columnWidth * categoryColSpan) - 32;
      setContainerWidth(Math.max(300, availableWidth));
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [category.w]);

  // Générer le layout pour la grille interne
  const internalLayout: GridItem[] = widgets.map((widget) => ({
    i: widget.id,
    x: widget.categoryX || 0,
    y: widget.categoryY || 0,
    w: Math.min(widget.w, COLS),
    h: widget.h,
    minW: 2,
    minH: 2,
  }));

  const handleInternalLayoutChange = (newLayout: GridItem[]) => {
    if (!isEditMode || !onWidgetLayoutChange) return;
    
    const updates = newLayout.map((item) => ({
      id: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    
    onWidgetLayoutChange(category.id, updates);
  };

  // Gérer le drop dans la zone de drop
  const handleDrop = () => {
    if (!isDragging || !draggedWidget) return;

    const result = endDrag();
    if (!result) return;

    // Widget depuis la grille principale vers cette catégorie
    if (result.sourceType === 'main') {
      onWidgetDropIn?.(result.widget.id, category.id);
    }
    // Widget depuis une autre catégorie vers cette catégorie
    else if (result.sourceCategoryId && result.sourceCategoryId !== category.id) {
      onWidgetDropIn?.(result.widget.id, category.id);
    }
    // Widget depuis cette même catégorie -> sortir vers grille principale
    else if (result.sourceCategoryId === category.id) {
      onWidgetDropOut?.(result.widget.id);
    }

    setIsDropZoneHovered(false);
  };

  const handleDropZoneEnter = () => {
    if (isDragging) setIsDropZoneHovered(true);
  };

  const handleDropZoneLeave = () => {
    setIsDropZoneHovered(false);
  };

  return (
    <div 
      className="h-full w-full rounded-xl flex flex-col shadow-lg border transition-all duration-300 hover:shadow-2xl relative category-container overflow-hidden"
      style={{
        background: category.color 
          ? `linear-gradient(135deg, ${category.color}08 0%, ${category.color}18 100%)`
          : 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.2) 100%)',
        borderColor: category.color || 'hsl(var(--border))',
      }}
    >
      {/* Effet décoratif */}
      <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: category.color || 'hsl(var(--primary))' }}
      />

      {/* Header - Moderne et stylé */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-xl bg-gradient-to-r from-background/60 via-background/80 to-background/60 flex-shrink-0 transition-all group hover:from-background/70 hover:via-background/90 hover:to-background/70"
        style={{
          borderBottomColor: category.color ? `${category.color}40` : 'hsl(var(--border))',
        }}
      >
        {/* Barre décorative */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
          style={{ 
            backgroundColor: category.color || 'hsl(var(--primary))',
            boxShadow: `0 0 8px ${category.color || 'hsl(var(--primary))'}`
          }} 
        />

        {/* Section gauche: Drag + Icône + Nom */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Zone de drag ISOLÉE - SEULEMENT ici on peut drag la catégorie */}
          {isEditMode && (
            <button
              type="button"
              className="category-drag-handle cursor-grab active:cursor-grabbing hover:bg-primary/10 rounded-lg p-1.5 transition-all hover:scale-110"
              title="Déplacer la catégorie"
            >
              <GripVertical className="h-4 w-4 pointer-events-none" style={{ color: category.color || 'hsl(var(--primary))' }} />
            </button>
          )}

          {/* Zone de drop pour Ctrl+drag cross-grid */}
          {isEditMode && isDragging && (
            <div
              ref={dropZoneRef}
              className={`h-8 px-3 rounded-lg border-2 border-dashed transition-all duration-300 flex items-center gap-1.5 cursor-pointer animate-in fade-in slide-in-from-left-4 ${
                isDropZoneHovered 
                  ? 'border-primary bg-primary/20 scale-110 shadow-lg shadow-primary/30' 
                  : 'border-primary/60 bg-primary/10 scale-100'
              }`}
              title={sourceCategoryId === category.id 
                ? "Déposer ici pour sortir le widget vers la grille principale" 
                : "Déposer ici pour ajouter le widget à cette catégorie"}
              onPointerEnter={handleDropZoneEnter}
              onPointerLeave={handleDropZoneLeave}
              onPointerUp={handleDrop}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={`text-xs font-medium text-primary transition-transform ${isDropZoneHovered ? 'scale-125' : ''}`}>
                {isDropZoneHovered ? '✓' : '📥'}
              </span>
              <span className="text-[10px] text-primary font-medium">
                {sourceCategoryId === category.id ? 'Sortir' : 'Déposer'}
              </span>
            </div>
          )}
          
          {/* Icône de la catégorie - Plus large et stylée */}
          <div 
            className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-xl shadow-md transition-all hover:scale-110 hover:rotate-6"
            style={{
              background: category.color 
                ? `linear-gradient(135deg, ${category.color}30, ${category.color}50)`
                : 'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.5))',
              boxShadow: `0 4px 12px ${category.color || 'hsl(var(--primary))'}20`,
            }}
          >
            {category.icon ? (
              <span className="text-lg">{category.icon}</span>
            ) : (
              <Folder className="h-4 w-4" style={{ color: category.color || 'hsl(var(--primary))' }} />
            )}
          </div>

          {/* Nom et stats - Plus espacé */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 
              className="font-bold text-base leading-tight truncate transition-colors"
              style={{ color: category.color || 'hsl(var(--foreground))' }}
            >
              {category.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium text-muted-foreground/80">
                {widgets.length} {widgets.length <= 1 ? 'widget' : 'widgets'}
              </span>
              {!isCollapsed && (
                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Actions - Boutons stylés */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Bouton collapse/expand */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0 hover:bg-primary/10 widget-no-drag rounded-lg transition-all hover:scale-110"
            title={isCollapsed ? 'Afficher les widgets' : 'Masquer les widgets'}
            style={{
              color: category.color || 'hsl(var(--foreground))',
            }}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>

          {/* Bouton supprimer (mode édition) */}
          {isEditMode && onCategoryDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCategoryDelete(category.id)}
              className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive widget-no-drag rounded-lg transition-all hover:scale-110"
              title="Supprimer la catégorie"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenu: Grille de widgets (SEULEMENT si non collapsed) */}
      {!isCollapsed && widgets.length > 0 && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 widget-drop-zone category-content" style={{ maxHeight: '100%' }}>
          <CustomGridLayout
            layout={internalLayout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={containerWidth - 24}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType="vertical"
            preventCollision={true}
            onLayoutChange={handleInternalLayoutChange}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            className="category-grid"
          >
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-card/90 backdrop-blur-sm border rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all hover:border-primary/40 hover:scale-[1.02] h-full w-full"
              >
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
      )}

      {/* Zone vide quand replié ET quand pas de widgets */}
      {!isCollapsed && widgets.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4 min-h-[100px] category-inner-zone">
          <div className="text-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 w-full hover:border-muted-foreground/40 transition-colors"
            style={{
              borderColor: category.color ? `${category.color}30` : undefined,
            }}
          >
            <p className="text-sm text-muted-foreground/70">
              {isEditMode ? "Aucun widget dans cette catégorie" : "Aucun widget dans cette catégorie"}
            </p>
            {isEditMode && (
              <p className="text-xs text-muted-foreground/50 mt-1">
                Pour ajouter un widget : Cliquez sur ✏️ du widget → Choisissez cette catégorie
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
