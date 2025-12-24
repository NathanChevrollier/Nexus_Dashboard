"use client";

import { useState, useEffect, useCallback } from "react";
import GridLayout from "@/components/ui/grid-layout";
import type { Layout } from "react-grid-layout";
import { Dashboard, Widget, Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Edit, Save, Plus, Folder, Calendar, BarChart3, Layers } from "lucide-react";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { CategoryGridItem } from "@/components/dashboard/category-grid-item";
import { AddWidgetDialogModern } from "@/components/dashboard/add-widget-dialog-modern";
import { AddCategoryDialog } from "@/components/dashboard/add-category-dialog";
import { EditWidgetDialog } from "@/components/dashboard/edit-widget-dialog";
import { updateWidgetPositions, deleteWidget } from "@/lib/actions/widgets";
import { updateCategoryPositions, deleteCategory } from "@/lib/actions/categories";

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [saving, setSaving] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth - 48;
      setContainerWidth(width);
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
    
    // Hauteur: 1 ligne pour header + (nombre de widgets * taille) si ouvert
    const headerHeight = 1;
    const widgetHeight = isCollapsed ? 0 : categoryWidgets.reduce((sum, w) => sum + w.h, 0);
    const totalHeight = headerHeight + (isCollapsed ? 0 : Math.max(widgetHeight, categoryWidgets.length > 0 ? 2 : 1));
    
    return {
      i: `cat-${cat.id}`,
      x: cat.x,
      y: cat.y,
      w: Math.min(cat.w || 4, 6), // Max 6 colonnes pour les catégories
      h: totalHeight,
      static: !isEditMode,
      minW: 3,
      maxW: 6,
      minH: 1,
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

  const mainLayout = [...categoryLayout, ...widgetLayout];

  // Gérer les changements de layout (drag & drop / resize)
  const handleLayoutChange = (newLayout: any[]) => {
    if (!isEditMode) return;

    const updatedCategories = categories.map((cat) => {
      const layoutItem = newLayout.find((l) => l.i === `cat-${cat.id}`);
      if (layoutItem) {
        return { ...cat, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w };
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
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce widget ?")) {
      try {
        await deleteWidget(widgetId);
        setWidgets(widgets.filter((w) => w.id !== widgetId));
      } catch (error) {
        console.error("Erreur:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm("Supprimer cette catégorie ? Les widgets seront déplacés hors catégorie.")) {
      try {
        await deleteCategory(categoryId);
        setCategories(categories.filter((c) => c.id !== categoryId));
        setWidgets((prev) =>
          prev.map((w) => (w.categoryId === categoryId ? { ...w, categoryId: null } : w))
        );
      } catch (error) {
        console.error("Erreur:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowEditDialog(true);
  };

  const handleWidgetUpdated = (widgetId: string, newCategoryId: string | null, oldCategoryId: string | null) => {
    // Si la catégorie a changé, repositionner le widget
    if (newCategoryId !== oldCategoryId && newCategoryId) {
      repositionWidgetNearCategory(widgetId, newCategoryId);
    }
    // Recharger pour avoir les données à jour
    window.location.reload();
  };

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
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {isOwner && (
        <div className="border-b bg-gradient-to-br from-card/40 via-background to-card/20 backdrop-blur-xl shadow-md px-8 py-4 relative overflow-hidden">
          {/* Effet de fond décoratif */}
          <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex items-center justify-between">
            {/* Section gauche: Titre + Stats */}
            <div className="flex items-center gap-6">
              {/* Titre Dashboard */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/15 blur-lg rounded-full" />
                  <div className="relative h-10 w-1 bg-gradient-to-b from-primary via-primary to-primary/40 rounded-full shadow-md shadow-primary/30" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {dashboard.name}
                  </h2>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    {isEditMode ? "✏️ Mode édition actif" : "📊 Tableau de bord"}
                  </p>
                </div>
              </div>

              {/* Stats rapides */}
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-lg border border-border/30 backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none">Widgets</span>
                    <span className="text-sm font-bold text-foreground">{widgets.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-lg border border-border/30 backdrop-blur-sm">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none">Catégories</span>
                    <span className="text-sm font-bold text-foreground">{categories.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section centre: Date et Heure */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="px-5 py-2.5 bg-gradient-to-br from-card/80 to-card/40 rounded-xl border border-primary/10 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground leading-tight">
                      {formatDate()}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
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
            <div className="flex gap-2.5">
              {isEditMode ? (
                <>
                  <Button 
                    onClick={() => setShowAddDialog(true)} 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Widget</span>
                  </Button>
                  <Button 
                    onClick={() => setShowAddCategoryDialog(true)}
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                  >
                    <Folder className="h-4 w-4" />
                    <span className="font-medium">Catégorie</span>
                  </Button>
                  <Button 
                    onClick={saveLayout} 
                    disabled={saving} 
                    size="sm" 
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all"
                  >
                    <Save className="h-4 w-4" />
                    <span className="font-medium">{saving ? "Enregistrement..." : "Enregistrer"}</span>
                  </Button>
                  <Button 
                    onClick={() => setIsEditMode(false)} 
                    variant="ghost" 
                    size="sm"
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditMode(true)} 
                  size="sm" 
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all"
                >
                  <Edit className="h-4 w-4" />
                  <span className="font-medium">Modifier</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {/* Message d'aide en mode édition */}
        {isEditMode && mainLayout.length > 0 && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs">💡</span>
                </div>
              </div>
              <div className="flex-1 text-sm space-y-1">
                <p className="font-medium text-foreground">Comment organiser ton dashboard:</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>• <strong>Déplacer/Redimensionner:</strong> Glisse les catégories (dossiers) sur la grille</li>
                  <li>• <strong>Assigner à une catégorie:</strong> Clique sur ✏️ d'un widget → Choisis une catégorie → Il apparaît DANS le dossier</li>
                  <li>• <strong>Fermer/Ouvrir:</strong> Clique sur le chevron d'une catégorie pour masquer/afficher son contenu (la grille se réorganise)</li>
                </ul>
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
          <GridLayout
            className="layout"
            layout={mainLayout as Layout}
            cols={12}
            rowHeight={80}
            width={containerWidth}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType={null}
            preventCollision={false}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            draggableCancel=".widget-no-drag, input, textarea, button, select, a, [role='button']"
            margin={[16, 16]}
            containerPadding={[0, 0]}
            {...({} as any)}
          >
            {categories.map((category) => {
              const categoryWidgets = widgets.filter((w) => w.categoryId === category.id);
              
              return (
                <div key={`cat-${category.id}`} className="overflow-hidden">
                  <CategoryGridItem
                    category={category}
                    widgets={categoryWidgets}
                    isCollapsed={collapsedCategories.has(category.id)}
                    isEditMode={isEditMode}
                    onToggleCollapse={() => toggleCategoryCollapse(category.id)}
                    onCategoryDelete={handleDeleteCategory}
                    onWidgetEdit={handleEditWidget}
                    onWidgetDelete={handleDeleteWidget}
                  />
                </div>
              );
            })}

            {/* SEULEMENT les widgets non catégorisés */}
            {uncategorizedWidgets.map((widget) => {
              return (
                <div
                  key={`widget-${widget.id}`}
                  className="bg-card border-2 rounded-lg shadow-sm relative overflow-hidden"
                  style={{
                    borderColor: 'hsl(var(--border))',
                  }}
                >
                  <WidgetComponent
                    widget={widget}
                    isEditMode={isEditMode}
                    onEdit={() => handleEditWidget(widget)}
                    onDelete={() => handleDeleteWidget(widget.id)}
                  />
                </div>
              );
            })}
          </GridLayout>
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
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onWidgetUpdated={handleWidgetUpdated}
      />
    </div>
  );
}
