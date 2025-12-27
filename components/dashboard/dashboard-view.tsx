"use client";

import { useState, useEffect, useCallback } from "react";
import { CustomGridLayout, GridItem } from "@/components/ui/custom-grid-layout";
import { Dashboard, Widget, Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Edit, Save, Plus, Folder, Calendar, BarChart3, Layers } from "lucide-react";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { CategoryGridItem } from "@/components/dashboard/category-grid-item";
import { AddWidgetDialogModern } from "@/components/dashboard/add-widget-dialog-modern";
import { AddCategoryDialog } from "@/components/dashboard/add-category-dialog";
import { EditWidgetDialog } from "@/components/dashboard/edit-widget-dialog";
import { ShareDashboardDialog } from "@/components/dashboard/share-dashboard-dialog";
import { updateWidgetPositions, deleteWidget } from "@/lib/actions/widgets";
import { updateCategoryPositions, deleteCategory } from "@/lib/actions/categories";
import { CrossGridDragProvider, useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-v2";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useAlert } from "@/components/ui/confirm-provider";

interface DashboardViewProps {
  dashboard: Dashboard;
  isOwner: boolean;
  initialWidgets?: Widget[];
  initialCategories?: Category[];
}

export function DashboardView({ 
  dashboard, 
  isOwner, 
  initialWidgets = [], 
  initialCategories = [] 
}: DashboardViewProps) {
  const alert = useAlert();
  return (
    <CrossGridDragProvider>
      <DashboardViewInner
        dashboard={dashboard}
        isOwner={isOwner}
        initialWidgets={initialWidgets}
        initialCategories={initialCategories}
      />
    </CrossGridDragProvider>
  );
}

function DashboardViewInner({ 
  dashboard, 
  isOwner, 
  initialWidgets = [], 
  initialCategories = [] 
}: DashboardViewProps) {
  const { isDragging, draggedWidget, cancelDrag } = useCrossGridDrag();
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Suivre la position de la souris pendant le drag cross-grid
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  // Annuler le drag cross-grid avec Échap
  useEffect(() => {
    if (!isDragging) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag();
        // Réinitialiser l'état visuel des éléments en drag
        const draggedElements = document.querySelectorAll('[data-cross-grid-drag="true"]');
        draggedElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.dataset.crossGridDrag = 'false';
            el.style.transform = '';
            el.style.boxShadow = '';
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, cancelDrag]);

  // Calculate responsive grid columns based on screen width
  const getResponsiveCols = () => {
    if (typeof window === 'undefined') return 12;
    const width = window.innerWidth;
    if (width < 640) return 4;    // Mobile: 4 columns
    if (width < 1024) return 8;   // Tablet: 8 columns
    return 12;                     // Desktop: 12 columns
  };

  const [responsiveCols, setResponsiveCols] = useState(12);

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth - 48;
      setContainerWidth(width);
      setResponsiveCols(getResponsiveCols());
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle collapse d'une catégorie
  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Trouver une position libre dans la grille
  const findFreePosition = useCallback((startX: number, startY: number, w: number = 2, h: number = 2) => {
    const occupiedPositions = new Set<string>();
    
    // Marquer toutes les positions occupées
    [...categories, ...widgets].forEach((item) => {
      for (let y = item.y; y < item.y + item.h; y++) {
        for (let x = item.x; x < item.x + item.w; x++) {
          occupiedPositions.add(`${x},${y}`);
        }
      }
    });

    // Chercher une position libre en spirale
    let searchRadius = 0;
    while (searchRadius < 20) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const testX = Math.max(0, Math.min(12 - w, startX + dx));
          const testY = Math.max(0, startY + dy);
          
          // Vérifier si toute la zone est libre
          let isFree = true;
          for (let y = testY; y < testY + h && isFree; y++) {
            for (let x = testX; x < testX + w && isFree; x++) {
              if (occupiedPositions.has(`${x},${y}`)) {
                isFree = false;
              }
            }
          }
          
          if (isFree) {
            return { x: testX, y: testY };
          }
        }
      }
      searchRadius++;
    }
    
    // Fallback: position par défaut
    return { x: 0, y: Math.max(...[...categories, ...widgets].map(i => i.y + i.h), 0) };
  }, [categories, widgets]);

  // Repositionner un widget près de sa catégorie
  const repositionWidgetNearCategory = useCallback((widgetId: string, categoryId: string | null) => {
    if (!categoryId) return;
    
    const category = categories.find((c) => c.id === categoryId);
    const widget = widgets.find((w) => w.id === widgetId);
    if (!category || !widget) return;

    // Position cible: juste en dessous de la catégorie
    const targetX = category.x;
    const targetY = category.y + category.h;
    
    // Trouver une position libre
    const freePos = findFreePosition(targetX, targetY, widget.w, widget.h);
    
    // Mettre à jour la position du widget
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, x: freePos.x, y: freePos.y } : w
      )
    );
  }, [categories, widgets, findFreePosition]);

  // Générer le layout pour la grille unique
  const categoryLayout = categories.map((cat) => {
    const categoryWidgets = widgets.filter((w) => w.categoryId === cat.id);
    const isCollapsed = collapsedCategories.has(cat.id);
    
    // Hauteur fixe basée sur la configuration de la catégorie
    const totalHeight = isCollapsed ? 1 : (cat.h || 4);
    
    return {
      i: `cat-${cat.id}`,
      x: cat.x,
      y: cat.y,
      // Laisser la catégorie occuper sa largeur configurée
      w: cat.w || 12,
      h: totalHeight,
      static: !isEditMode,
      minW: 3,
      maxW: 12,
      minH: 1,
      maxH: isCollapsed ? 1 : 10, // Max 10 lignes pour une catégorie
    };
  });

  // SEULEMENT les widgets NON catégorisés sur la grille principale
  const uncategorizedWidgets = widgets.filter((w) => !w.categoryId);
  const widgetLayout = uncategorizedWidgets.map((w) => ({
    i: `widget-${w.id}`,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    static: !isEditMode,
    minW: 2,
    minH: 2,
  }));

  const mainLayout: GridItem[] = [...categoryLayout, ...widgetLayout];

  // Gérer les changements de layout (drag & drop / resize)
  const handleLayoutChange = (newLayout: GridItem[]) => {
    if (!isEditMode) return;

    const updatedCategories = categories.map((cat) => {
      const layoutItem = newLayout.find((l) => l.i === `cat-${cat.id}`);
      if (layoutItem) {
        return { ...cat, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
      }
      return cat;
    });

    const updatedWidgets = widgets.map((w) => {
      // Ne mettre à jour que les widgets non catégorisés (sur la grille principale)
      if (w.categoryId) return w;
      
      const layoutItem = newLayout.find((l) => l.i === `widget-${w.id}`);
      if (layoutItem) {
        return { ...w, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
      }
      return w;
    });

    setCategories(updatedCategories);
    setWidgets(updatedWidgets);
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const widgetUpdates = widgets.map((w) => ({
        id: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        categoryId: w.categoryId,
        categoryX: w.categoryX ?? undefined,
        categoryY: w.categoryY ?? undefined,
      }));
      await updateWidgetPositions(widgetUpdates);

      const categoryUpdates = categories.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      }));
      await updateCategoryPositions(categoryUpdates);

      setIsEditMode(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      await alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Gérer les changements de layout interne des catégories
  const handleCategoryWidgetLayoutChange = useCallback((categoryId: string, layouts: Array<{id: string, x: number, y: number, w: number, h: number}>) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        const layout = layouts.find((l) => l.id === widget.id);
        if (layout && widget.categoryId === categoryId) {
          return {
            ...widget,
            categoryX: layout.x,
            categoryY: layout.y,
            w: layout.w,
            h: layout.h,
          };
        }
        return widget;
      })
    );
  }, []);

  // Gérer le drop d'un widget DANS une catégorie
  const handleWidgetDropIn = useCallback((widgetId: string, categoryId: string) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.id === widgetId) {
          return {
            ...widget,
            categoryId: categoryId,
            categoryX: 0,
            categoryY: 0,
          };
        }
        return widget;
      })
    );
  }, []);

  // Gérer le drop d'un widget HORS d'une catégorie
  const handleWidgetDropOut = useCallback((widgetId: string) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.id === widgetId) {
          // Trouver une position libre sur la grille principale
          const pos = findFreePosition(0, 0, widget.w, widget.h);
          return {
            ...widget,
            categoryId: null,
            categoryX: null,
            categoryY: null,
            x: pos.x,
            y: pos.y,
          };
        }
        return widget;
      })
    );
  }, [findFreePosition]);

  const confirm = useConfirm();

  const handleDeleteWidget = async (widgetId: string) => {
    if (await confirm("Voulez-vous vraiment supprimer ce widget ?")) {
      try {
        await deleteWidget(widgetId);
        setWidgets(widgets.filter((w) => w.id !== widgetId));
      } catch (error) {
        console.error("Erreur:", error);
        await alert("Erreur lors de la suppression");
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (await confirm("Supprimer cette catégorie ? Les widgets seront déplacés hors catégorie.")) {
      try {
        await deleteCategory(categoryId);
        setCategories(categories.filter((c) => c.id !== categoryId));
        setWidgets((prev) =>
          prev.map((w) => (w.categoryId === categoryId ? { ...w, categoryId: null } : w))
        );
      } catch (error) {
        console.error("Erreur:", error);
        await alert("Erreur lors de la suppression");
      }
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowEditDialog(true);
  };

  const handleWidgetUpdated = (
    widgetId: string,
    newCategoryId: string | null,
    oldCategoryId: string | null,
    updatedOptions?: any
  ) => {
    // Mettre à jour localement le widget
    setWidgets((prevWidgets) => {
      const widget = prevWidgets.find(w => w.id === widgetId);
      if (!widget) return prevWidgets;

      return prevWidgets.map((w) => {
        if (w.id === widgetId) {
          // Appliquer les options mises à jour tout de suite pour refléter l'UI
          const withOptions = updatedOptions ? { ...w, options: updatedOptions } : w;
          // Si on déplace vers une catégorie
          if (newCategoryId) {
            // Trouver tous les widgets déjà dans cette catégorie
            const categoryWidgets = prevWidgets.filter(cw => cw.categoryId === newCategoryId && cw.id !== widgetId);
            
            // Fonction pour trouver une position libre
            const findFreeCategoryPosition = (ww: number, hh: number): { x: number; y: number } => {
              const COLS = 6;
              
              const isPositionFree = (x: number, y: number) => {
                return !categoryWidgets.some(cw => {
                  return !(
                    x + ww <= (cw.categoryX || 0) ||
                    x >= (cw.categoryX || 0) + cw.w ||
                    y + hh <= (cw.categoryY || 0) ||
                    y >= (cw.categoryY || 0) + cw.h
                  );
                });
              };

              for (let y = 0; y < 20; y++) {
                for (let x = 0; x <= COLS - ww; x++) {
                  if (isPositionFree(x, y)) {
                    return { x, y };
                  }
                }
              }

              const maxY = Math.max(0, ...categoryWidgets.map(cw => (cw.categoryY || 0) + cw.h));
              return { x: 0, y: maxY };
            };

            const freePos = findFreeCategoryPosition(widget.w, widget.h);

            return {
              ...withOptions,
              categoryId: newCategoryId,
              categoryX: freePos.x,
              categoryY: freePos.y,
            };
          }
          // Si on retire d'une catégorie (vers la grille principale)
          else if (oldCategoryId && !newCategoryId) {
            // Trouver une position libre sur la grille principale
            const pos = findFreePosition(0, 0, widget.w, widget.h);
            return {
              ...withOptions,
              categoryId: null,
              categoryX: null,
              categoryY: null,
              x: pos.x,
              y: pos.y,
            };
          }
          // Pas de changement de catégorie: juste mettre à jour les options localement
          return withOptions;
        }
        return w;
      });
    });
  };

  // Gérer le drop d'un widget dans une catégorie (via Ctrl+drag)
  const handleWidgetDropInCategory = useCallback((widgetId: string, categoryId: string) => {
    setWidgets((prevWidgets) => {
      const widget = prevWidgets.find(w => w.id === widgetId);
      if (!widget) return prevWidgets;

      // Trouver tous les widgets déjà dans cette catégorie
      const categoryWidgets = prevWidgets.filter(w => w.categoryId === categoryId && w.id !== widgetId);
      
      // Fonction pour trouver une position libre dans la catégorie (grille 6 colonnes)
      const findFreeCategoryPosition = (w: number, h: number): { x: number; y: number } => {
        const COLS = 6;
        
        // Vérifier si une position est libre
        const isPositionFree = (x: number, y: number) => {
          return !categoryWidgets.some(cw => {
            return !(
              x + w <= (cw.categoryX || 0) ||
              x >= (cw.categoryX || 0) + cw.w ||
              y + h <= (cw.categoryY || 0) ||
              y >= (cw.categoryY || 0) + cw.h
            );
          });
        };

        // Essayer de trouver une position libre
        for (let y = 0; y < 20; y++) {
          for (let x = 0; x <= COLS - w; x++) {
            if (isPositionFree(x, y)) {
              return { x, y };
            }
          }
        }

        // Si rien n'est libre, mettre à la fin
        const maxY = Math.max(0, ...categoryWidgets.map(w => (w.categoryY || 0) + w.h));
        return { x: 0, y: maxY };
      };

      const freePos = findFreeCategoryPosition(widget.w, widget.h);

      return prevWidgets.map((w) => {
        if (w.id === widgetId) {
          return {
            ...w,
            categoryId: categoryId,
            categoryX: freePos.x,
            categoryY: freePos.y,
          };
        }
        return w;
      });
    });
  }, []);

  // Gérer le drop d'un widget hors d'une catégorie (vers grille principale)
  const handleWidgetDropOutCategory = useCallback((widgetId: string) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.id === widgetId) {
          // Trouver une position libre sur la grille principale
          const pos = findFreePosition(0, 0, widget.w, widget.h);
          return {
            ...widget,
            categoryId: null,
            categoryX: null,
            categoryY: null,
            x: pos.x,
            y: pos.y,
          };
        }
        return widget;
      })
    );
  }, [findFreePosition]);

  const handleCategoryAdded = () => {
    window.location.reload();
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return currentTime.toLocaleDateString('fr-FR', options);
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden relative">
      {/* Widget miniature qui suit la souris pendant le cross-grid drag */}
      {isDragging && draggedWidget && (
        <div 
          className="fixed pointer-events-none z-50 animate-in fade-in duration-150"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
          }}
        >
          {/* Petit badge compact */}
          <div className="bg-primary/90 text-primary-foreground rounded-md shadow-lg px-2 py-1 text-xs font-medium flex items-center gap-1.5 border border-primary-foreground/20">
            <span className="text-sm">🔄</span>
            <span className="truncate max-w-[100px]">{draggedWidget.options?.title || draggedWidget.type}</span>
          </div>
        </div>
      )}
      
      {isOwner && (
        <div className="border-b bg-gradient-to-br from-card/40 via-background to-card/20 backdrop-blur-xl shadow-md px-4 sm:px-6 lg:px-8 py-4 relative overflow-hidden">
          {/* Effet de fond décoratif */}
          <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0">
            {/* Section gauche: Titre + Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
              {/* Titre Dashboard */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative hidden sm:block">
                  <div className="absolute inset-0 bg-primary/15 blur-lg rounded-full" />
                  <div className="relative h-10 w-1 bg-gradient-to-b from-primary via-primary to-primary/40 rounded-full shadow-md shadow-primary/30" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {dashboard.name}
                  </h2>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    {isEditMode ? "✏️ Mode édition actif" : "📊 Tableau de bord"}
                  </p>
                </div>
              </div>

              {/* Stats rapides */}
              <div className="flex items-center gap-2 sm:gap-3 ml-0 sm:ml-4">
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-card/50 rounded-lg border border-border/30 backdrop-blur-sm">
                  <Layers className="h-3 sm:h-4 w-3 sm:w-4 text-primary flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none hidden xs:inline">Widgets</span>
                    <span className="text-sm font-bold text-foreground">{widgets.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-card/50 rounded-lg border border-border/30 backdrop-blur-sm">
                  <BarChart3 className="h-3 sm:h-4 w-3 sm:w-4 text-primary flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none hidden xs:inline">Catégories</span>
                    <span className="text-sm font-bold text-foreground">{categories.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section centre: Date et Heure */}
            <div className="w-full sm:w-auto lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-br from-card/80 to-card/40 rounded-xl border border-primary/10 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1 sm:p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-3 sm:h-4 w-3 sm:w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs leading-tight line-clamp-1">
                      {formatDate()}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-mono font-medium text-primary/90">
                        {formatTime()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full lg:w-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setShowShareDialog(true)} className="gap-2 text-xs sm:text-sm">
                Partager
              </Button>
              <ShareDashboardDialog open={showShareDialog} onOpenChange={setShowShareDialog} dashboardId={dashboard.id} />
              {isEditMode ? (
                <>
                  <Button 
                    onClick={() => setShowAddDialog(true)} 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 sm:gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all text-xs sm:text-sm"
                  >
                    <Plus className="h-3 sm:h-4 w-3 sm:w-4" />
                    <span className="font-medium hidden sm:inline">Widget</span>
                  </Button>
                  <Button 
                    onClick={() => setShowAddCategoryDialog(true)}
                    variant="outline" 
                    size="sm"
                    className="gap-1 sm:gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all text-xs sm:text-sm"
                  >
                    <Folder className="h-3 sm:h-4 w-3 sm:w-4" />
                    <span className="font-medium hidden sm:inline">Catégorie</span>
                  </Button>
                  <Button 
                    onClick={saveLayout} 
                    disabled={saving} 
                    size="sm" 
                    className="gap-1 sm:gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all text-xs sm:text-sm"
                  >
                    <Save className="h-3 sm:h-4 w-3 sm:w-4" />
                    <span className="font-medium hidden sm:inline">{saving ? "Enregistrement..." : "Enregistrer"}</span>
                    <span className="font-medium sm:hidden">{saving ? "..." : "OK"}</span>
                  </Button>
                  <Button 
                    onClick={() => setIsEditMode(false)} 
                    variant="ghost" 
                    size="sm"
                    className="hover:bg-destructive/10 hover:text-destructive text-xs sm:text-sm"
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditMode(true)} 
                  size="sm" 
                  className="gap-1 sm:gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all text-xs sm:text-sm"
                >
                  <Edit className="h-3 sm:h-4 w-3 sm:w-4" />
                  <span className="font-medium hidden sm:inline">Modifier</span>
                  <span className="font-medium sm:hidden">Éditer</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-full">
        {/* Message d'aide en mode édition */}
        {isEditMode && mainLayout.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-br from-primary/8 via-primary/5 to-primary/8 border border-primary/20 rounded-xl backdrop-blur-sm shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/50 flex items-center justify-center shadow-lg">
                  <span className="text-base">💡</span>
                </div>
              </div>
              <div className="flex-1 text-sm space-y-2">
                <p className="font-bold text-foreground text-base">🎯 Guide d'organisation du dashboard</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5 bg-background/40 p-3 rounded-lg border border-border/50">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <span className="text-primary">📦</span> Catégories
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• <strong>Déplacer:</strong> Utilise la poignée ⋮⋮ dans le header</li>
                      <li>• <strong>Redimensionner:</strong> Tire les coins de la catégorie</li>
                      <li>• <strong>Replier/Déplier:</strong> Clique sur le chevron (˅/˄)</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5 bg-background/40 p-3 rounded-lg border border-border/50">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <span className="text-primary">🎨</span> Widgets
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• <strong>Déplacer:</strong> Glisse-dépose directement sur la grille</li>
                      <li>• <strong>Changer de catégorie:</strong> Ctrl/Cmd+Clic sur la poignée ⋮⋮ puis dépose sur 📥</li>
                      <li>• <strong>Annuler:</strong> Appuie sur <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Échap</kbd> pour annuler</li>
                      <li>• <strong>Ou via menu:</strong> Clique sur ✏️ puis choisis une catégorie</li>
                      <li>• <strong>Redimensionner:</strong> Tire le coin en bas à droite</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-primary">💡 Astuce Pro:</strong> Maintiens <kbd className="px-1 py-0.5 bg-primary/10 rounded text-primary font-mono text-[10px]">Ctrl/Cmd</kbd> en cliquant sur la poignée ⋮⋮ d'un widget pour activer le mode cross-grid. Les zones de drop 📥 apparaissent dans les headers de catégories. Appuie sur <kbd className="px-1 py-0.5 bg-primary/10 rounded text-primary font-mono text-[10px]">Échap</kbd> pour annuler !
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {mainLayout.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Aucun widget pour le moment</p>
              {isOwner && !isEditMode && (
                <Button onClick={() => setIsEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Commencer à personnaliser
                </Button>
              )}
            </div>
          </div>
        ) : (
          <CustomGridLayout
            className="layout main-dashboard-grid"
            layout={mainLayout}
            cols={responsiveCols}
            rowHeight={80}
            width={containerWidth}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType="vertical"
            preventCollision={true}
            onLayoutChange={handleLayoutChange}
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {categories.map((category) => {
              const categoryWidgets = widgets.filter((w) => w.categoryId === category.id);
              
              return (
                <div 
                  key={`cat-${category.id}`} 
                  className="overflow-hidden category-grid-wrapper h-full w-full"
                >
                  <CategoryGridItem
                    category={category}
                    widgets={categoryWidgets}
                    isCollapsed={collapsedCategories.has(category.id)}
                    isEditMode={isEditMode}
                    onToggleCollapse={() => toggleCategoryCollapse(category.id)}
                    onCategoryDelete={handleDeleteCategory}
                    onWidgetEdit={handleEditWidget}
                    onWidgetDelete={handleDeleteWidget}
                    onWidgetLayoutChange={handleCategoryWidgetLayoutChange}
                    onWidgetDropIn={handleWidgetDropInCategory}
                    onWidgetDropOut={handleWidgetDropOutCategory}
                  />
                </div>
              );
            })}

            {/* SEULEMENT les widgets non catégorisés */}
            {uncategorizedWidgets.map((widget) => {
              return (
                <div
                  key={`widget-${widget.id}`}
                  className="bg-card border-2 rounded-lg shadow-sm relative overflow-hidden h-full w-full"
                  style={{
                    borderColor: 'hsl(var(--border))',
                  }}
                >
                  <WidgetComponent
                    key={`${widget.id}-${JSON.stringify(widget.options)}`}
                    widget={widget}
                    isEditMode={isEditMode}
                    sourceType="main"
                    onEdit={() => handleEditWidget(widget)}
                    onDelete={() => handleDeleteWidget(widget.id)}
                  />
                </div>
              );
            })}
          </CustomGridLayout>
        )}
      </div>

      <AddWidgetDialogModern
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        dashboardId={dashboard.id}
        onWidgetAdded={(newWidget: Widget) => setWidgets([...widgets, newWidget])}
      />

      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
        dashboardId={dashboard.id}
        onCategoryAdded={handleCategoryAdded}
      />

      <EditWidgetDialog
        widget={editingWidget}
        categories={categories}
        widgets={widgets}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onWidgetUpdated={handleWidgetUpdated}
      />
    </div>
  );
}
