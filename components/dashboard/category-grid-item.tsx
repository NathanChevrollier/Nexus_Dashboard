"use client";

import { Category, Widget } from "@/lib/db/schema";
import { ChevronDown, ChevronUp, Trash2, Folder, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetComponent } from "@/components/widgets/widget-component";

interface CategoryGridItemProps {
  category: Category;
  widgets: Widget[];
  isCollapsed: boolean;
  isEditMode: boolean;
  onToggleCollapse: () => void;
  onCategoryDelete?: (categoryId: string) => void;
  onWidgetEdit: (widget: Widget) => void;
  onWidgetDelete: (widgetId: string) => void;
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
}: CategoryGridItemProps) {
  return (
    <div 
      className="h-full w-full rounded-lg overflow-hidden flex flex-col shadow-md border-2 transition-all duration-300"
      style={{
        background: category.color 
          ? `linear-gradient(135deg, ${category.color}15 0%, ${category.color}25 100%)`
          : 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.3) 100%)',
        borderColor: category.color || 'hsl(var(--border))',
      }}
    >
      {/* Header - Zone de drag + contrôles */}
      <div 
        className={`flex items-center justify-between px-3 py-2 border-b backdrop-blur-sm bg-background/30 flex-shrink-0 ${
          isEditMode ? 'widget-drag-handle cursor-move hover:bg-background/50' : ''
        }`}
        style={{
          borderBottomColor: category.color ? `${category.color}30` : 'hsl(var(--border))',
        }}
      >
        {/* Section gauche: Icône + Nom + Count */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditMode && <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />}
          
          {/* Icône de la catégorie */}
          <div 
            className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md shadow-sm"
            style={{
              backgroundColor: category.color ? `${category.color}35` : 'hsl(var(--primary) / 0.25)',
            }}
          >
            {category.icon ? (
              <span className="text-base">{category.icon}</span>
            ) : (
              <Folder className="h-3.5 w-3.5" style={{ color: category.color || 'hsl(var(--primary))' }} />
            )}
          </div>

          {/* Nom et stats */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-bold text-sm leading-tight truncate" style={{ color: category.color || 'inherit' }}>
              {category.name}
            </h3>
            <p className="text-[10px] text-muted-foreground/70">
              <span className="font-medium">{widgets.length}</span> {widgets.length <= 1 ? 'widget' : 'widgets'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Bouton collapse/expand */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 w-7 p-0 hover:bg-background/50 widget-no-drag"
            title={isCollapsed ? 'Afficher les widgets' : 'Masquer les widgets'}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Bouton supprimer (mode édition) */}
          {isEditMode && onCategoryDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCategoryDelete(category.id)}
              className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive widget-no-drag"
              title="Supprimer la catégorie"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenu: Liste des widgets (si non collapsed) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[100px] border-2 border-dashed border-muted-foreground/20 rounded-md">
              <p className="text-xs text-muted-foreground">
                {isEditMode ? "Aucun widget" : "Aucun widget"}
              </p>
            </div>
          ) : (
            widgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-card border rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                style={{
                  minHeight: `${widget.h * 80}px`,
                }}
              >
                <WidgetComponent
                  widget={widget}
                  isEditMode={isEditMode}
                  onEdit={() => onWidgetEdit(widget)}
                  onDelete={() => onWidgetDelete(widget.id)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
