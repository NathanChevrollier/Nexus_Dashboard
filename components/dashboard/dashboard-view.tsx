"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { updateCategoryPositions, deleteCategory, toggleCategoryCollapse as toggleCategoryCollapseAction } from "@/lib/actions/categories";
import { CrossGridDragProvider, useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-context";
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
  const alert = useAlert();
  const confirm = useConfirm();

  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set(initialCategories.filter(c => c.isCollapsed).map(c => c.id)));
  const pendingToggleRef = useRef<Set<string>>(new Set());
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [responsiveCols, setResponsiveCols] = useState(12);
  const [currentTime, setCurrentTime] = useState<Date | null>(null); 
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // persisted scroll position key per dashboard
  const scrollKey = `dashboard-scroll-${dashboard.id}`;

  // --- EFFETS ---

  // 1. Suivi souris pour le drag visuel
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  // 2. Gestion Annulation Drag (Echap)
  useEffect(() => {
    if (!isDragging) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag();
        document.querySelectorAll('[data-cross-grid-drag="true"]').forEach((el) => {
          if (el instanceof HTMLElement) {
            delete el.dataset.crossGridDrag;
            el.style.transform = '';
            el.style.boxShadow = '';
          }
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, cancelDrag]);

  // 3. Gestion Responsive (Resize)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth - 48; // Marge safe
      setContainerWidth(width);

      // Calcul colonnes
      let cols = 12;
      const isMobileFormat = dashboard?.format === 'mobile';
      
      if (isMobileFormat) {
        if (width < 640) cols = 2;
        else if (width < 1024) cols = 4;
        else cols = 6;
      } else {
        if (width < 640) cols = 4;
        else if (width < 1024) cols = 8;
        else cols = 12;
      }
      setResponsiveCols(cols);
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dashboard?.format]);

  // 4. Horloge
  useEffect(() => {
    setCurrentTime(new Date()); 
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist / restore scroll position for the dashboard area
  useEffect(() => {
    const el = document.getElementById('dashboard-scroll-area');
    if (!el) return;

    // Restore
    try {
      const raw = localStorage.getItem(scrollKey);
      if (raw) {
        const v = Number(raw);
        if (!Number.isNaN(v)) el.scrollTop = v;
      }
    } catch (e) { /* ignore */ }

    // Debounced saver
    let t: number | null = null;
    const onScroll = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        try { localStorage.setItem(scrollKey, String(el.scrollTop)); } catch (e) { }
        t = null;
      }, 250);
    };

    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (t) window.clearTimeout(t);
    };
  }, [dashboard.id]);


  // --- LOGIQUE METIER ---

  const toggleCategoryCollapse = useCallback(async (categoryId: string) => {
    if (pendingToggleRef.current.has(categoryId)) return; // ignore rapid repeats
    pendingToggleRef.current.add(categoryId);
    // Use functional update to avoid stale closures when toggling rapidly
    let computedNewState = false;
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      const willCollapse = !prev.has(categoryId);
      computedNewState = willCollapse;
      if (willCollapse) next.add(categoryId); else next.delete(categoryId);
      return next;
    });

    try {
      await toggleCategoryCollapseAction(categoryId, computedNewState);
    } catch (err) {
      // Rollback on error using functional update
      setCollapsedCategories((prev) => {
        const next = new Set(prev);
        if (computedNewState) next.delete(categoryId); else next.add(categoryId);
        return next;
      });
    } finally {
      pendingToggleRef.current.delete(categoryId);
    }
  }, []);

  // NOTE: do not resync collapsed state from `initialCategories` on every prop change
  // to avoid overwriting optimistic toggles caused by user interactions or local edits.

  // Algorithme de recherche de place libre
  const findFreePosition = useCallback((startX: number, startY: number, w: number = 2, h: number = 2) => {
    const occupied = new Set<string>();
    
    [...categories, ...widgets.filter(w => !w.categoryId)].forEach((item) => {
      for (let y = item.y; y < item.y + item.h; y++) {
        for (let x = item.x; x < item.x + item.w; x++) {
          occupied.add(`${x},${y}`);
        }
      }
    });

    let radius = 0;
    while (radius < 50) { 
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = Math.max(0, Math.min(responsiveCols - w, startX + dx));
          const y = Math.max(0, startY + dy);
          
          let fit = true;
          for (let cy = 0; cy < h; cy++) {
            for (let cx = 0; cx < w; cx++) {
              if (occupied.has(`${x + cx},${y + cy}`)) {
                fit = false;
                break;
              }
            }
            if (!fit) break;
          }
          
          if (fit) return { x, y };
        }
      }
      radius++;
    }
    
    const maxY = Math.max(0, ...[...categories, ...widgets].map(i => i.y + i.h));
    return { x: 0, y: maxY };
  }, [categories, widgets, responsiveCols]);


  // --- CALCUL DYNAMIQUE DU LAYOUT ---
  const categoryLayout = categories.map((cat) => {
    const isCollapsed = collapsedCategories.has(cat.id);

    // 1. Calculer la hauteur réelle nécessaire pour le contenu de la catégorie
    const catWidgets = widgets.filter(w => w.categoryId === cat.id);
    
    // On cherche le widget le plus bas dans cette catégorie (Y + Hauteur)
    const maxWidgetY = Math.max(0, ...catWidgets.map(w => (w.categoryY || 0) + w.h));
    
    // On ajoute +1 pour le header. Minimum 4 lignes pour l'esthétique.
    const expandedHeight = Math.max(4, maxWidgetY + 1);

    // 2. Si plié = hauteur 1. Si déplié = on respecte la hauteur stockée en mode édition
    //    En mode affichage on s'assure d'au moins contenir les widgets (évite couper le contenu).
    const currentHeight = isCollapsed ? 1 : (isEditMode ? Math.max(1, cat.h || 4) : Math.max(expandedHeight, cat.h || 4));

    return {
      i: `cat-${cat.id}`,
      x: cat.x,
      y: cat.y,
      w: cat.w || 12,
      h: currentHeight, // C'est ici que la magie opère
      static: !isEditMode,
      minW: 3,
      maxW: responsiveCols,
      minH: 1,
    };
  });

  const uncategorizedWidgets = widgets.filter((w) => !w.categoryId);
  const widgetLayout = uncategorizedWidgets.map((w) => ({
    i: `widget-${w.id}`,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    static: !isEditMode,
    minW: 1,
    minH: 1,
  }));

  const mainLayout: GridItem[] = [...categoryLayout, ...widgetLayout];

  const handleLayoutChange = (newLayout: GridItem[]) => {
    if (!isEditMode) return;

    const updatedCats = categories.map((cat) => {
      const item = newLayout.find((l) => l.i === `cat-${cat.id}`);
      // On met à jour X, Y, W et H (permettre le redimensionnement manuel des catégories)
      return item ? { ...cat, x: item.x, y: item.y, w: item.w, h: item.h } : cat;
    });

    const updatedWidgets = widgets.map((w) => {
      if (w.categoryId) return w; 
      const item = newLayout.find((l) => l.i === `widget-${w.id}`);
      return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
    });

    setCategories(updatedCats);
    setWidgets(updatedWidgets);
  };

  // --- ACTIONS ---

  const saveLayout = async () => {
    setSaving(true);
    try {
      const widgetUpdates = widgets.map((w) => ({
        id: w.id,
        x: w.x, y: w.y, w: w.w, h: w.h,
        categoryId: w.categoryId,
        categoryX: w.categoryX ?? undefined,
        categoryY: w.categoryY ?? undefined,
      }));
      await updateWidgetPositions(widgetUpdates);

      const categoryUpdates = categories.map((c) => ({
        id: c.id, x: c.x, y: c.y, w: c.w, h: c.h,
      }));
      await updateCategoryPositions(categoryUpdates);

      setIsEditMode(false);
    } catch (error) {
      console.error("Save error:", error);
      await alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryWidgetLayoutChange = useCallback((categoryId: string, layouts: any[]) => {
    setWidgets(prev => prev.map(w => {
      if (w.categoryId !== categoryId) return w;
      const layout = layouts.find(l => l.id === w.id);
      if (layout) {
        return { ...w, categoryX: layout.x, categoryY: layout.y, w: layout.w, h: layout.h };
      }
      return w;
    }));
  }, []);

  const handleWidgetDropIn = useCallback((widgetId: string, categoryId: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== widgetId) return w;
      return { ...w, categoryId, categoryX: 0, categoryY: 0 }; 
    }));
  }, []);

  const handleWidgetDropOut = useCallback((widgetId: string) => {
    setWidgets(prev => {
      const widget = prev.find(w => w.id === widgetId);
      if (!widget) return prev;
      
      const pos = findFreePosition(0, 0, widget.w, widget.h);
      return prev.map(w => w.id === widgetId ? { 
        ...w, categoryId: null, categoryX: null, categoryY: null, x: pos.x, y: pos.y 
      } : w);
    });
  }, [findFreePosition]);

  const handleDeleteWidget = async (widgetId: string) => {
    if (await confirm("Supprimer ce widget ?")) {
      try {
        await deleteWidget(widgetId);
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
      } catch (e) { await alert("Erreur suppression"); }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (await confirm("Supprimer la catégorie ? Les widgets seront libérés.")) {
      try {
        await deleteCategory(categoryId);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setWidgets(prev => prev.map(w => w.categoryId === categoryId ? { ...w, categoryId: null } : w));
      } catch (e) { await alert("Erreur suppression"); }
    }
  };

  const formatDate = () => {
    if (!currentTime) return "...";
    return currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = () => {
    if (!currentTime) return "...";
    return currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden relative bg-background">
      
      {isDragging && draggedWidget && (
        <div 
          className="fixed pointer-events-none z-[9999] animate-in fade-in duration-150"
          style={{ left: `${mousePosition.x + 15}px`, top: `${mousePosition.y + 15}px` }}
        >
          <div className="bg-primary/90 text-primary-foreground rounded-md shadow-xl px-3 py-2 text-sm font-medium flex items-center gap-2 border border-white/20 backdrop-blur-md">
            <span>🚀</span>
            <span className="truncate max-w-[150px]">{draggedWidget.options?.title || draggedWidget.type}</span>
          </div>
        </div>
      )}
      
      {isOwner && (
        <div className="border-b bg-card/50 backdrop-blur-md px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="h-10 w-1 bg-primary rounded-full hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{dashboard.name}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {widgets.length} widgets</span>
                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {categories.length} catégories</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{formatDate()}</div>
            <div className="text-2xl font-bold font-mono leading-none tracking-tight text-foreground/80">{formatTime()}</div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button size="sm" variant="outline" onClick={() => setShowShareDialog(true)}>Partager</Button>
            
            {isEditMode ? (
              <>
                <div className="h-6 w-px bg-border mx-1" />
                <Button size="sm" variant="secondary" onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-1" /> Widget</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowAddCategoryDialog(true)}><Folder className="w-4 h-4 mr-1" /> Catégorie</Button>
                <div className="h-6 w-px bg-border mx-1" />
                <Button size="sm" onClick={saveLayout} disabled={saving}>
                  {saving ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
                  Sauvegarder
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditMode(false)} className="text-muted-foreground hover:text-foreground">Annuler</Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditMode(true)} className="bg-primary/90 hover:bg-primary">
                <Edit className="w-4 h-4 mr-2" /> Personnaliser
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6" id="dashboard-scroll-area">
        {isEditMode && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">💡</div>
            <div className="text-sm">
              <p className="font-semibold mb-1">Mode Édition Activé</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-muted-foreground list-disc list-inside">
                <li>Glissez les widgets pour les déplacer.</li>
                <li>Utilisez les poignées <span className="inline-block bg-muted px-1 rounded text-xs">⋮⋮</span> pour le drag.</li>
                <li>Maintenez <kbd className="font-mono text-xs bg-muted px-1 rounded">Ctrl</kbd> pour déplacer un widget <strong>entre</strong> catégories.</li>
                <li>Redimensionnez via le coin inférieur droit.</li>
              </ul>
            </div>
          </div>
        )}

        {mainLayout.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div className="p-4 bg-muted rounded-full mb-4"><Layers className="w-8 h-8" /></div>
            <h3 className="text-lg font-medium">C'est un peu vide ici...</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">Commencez par ajouter un widget ou une catégorie via le bouton "Personnaliser".</p>
          </div>
        )}

        {mainLayout.length > 0 && (
          <CustomGridLayout
            className="layout main-grid pb-20" 
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
              const catWidgets = widgets.filter(w => w.categoryId === category.id);
              return (
                <div key={`cat-${category.id}`} className="h-full w-full">
                  <CategoryGridItem
                    category={category}
                    widgets={catWidgets}
                    isCollapsed={collapsedCategories.has(category.id)}
                    isEditMode={isEditMode}
                    onToggleCollapse={() => toggleCategoryCollapse(category.id)}
                    onCategoryDelete={handleDeleteCategory}
                    onWidgetEdit={(w) => { setEditingWidget(w); setShowEditDialog(true); }}
                    onWidgetDelete={handleDeleteWidget}
                    onWidgetLayoutChange={handleCategoryWidgetLayoutChange}
                    onWidgetDropIn={handleWidgetDropIn}
                    onWidgetDropOut={handleWidgetDropOut}
                  />
                </div>
              );
            })}

            {uncategorizedWidgets.map((widget) => (
              <div key={`widget-${widget.id}`} className="h-full w-full">
                <WidgetComponent
                  widget={widget}
                  isEditMode={isEditMode}
                  sourceType="main"
                  onEdit={() => { setEditingWidget(widget); setShowEditDialog(true); }}
                  onDelete={() => handleDeleteWidget(widget.id)}
                />
              </div>
            ))}
          </CustomGridLayout>
        )}
      </div>

      <AddWidgetDialogModern
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        dashboardId={dashboard.id}
        onWidgetAdded={(w) => setWidgets([...widgets, w])}
      />
      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
        dashboardId={dashboard.id}
        onCategoryAdded={() => window.location.reload()} 
      />
      <EditWidgetDialog
        widget={editingWidget}
        categories={categories}
        widgets={widgets}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onWidgetUpdated={(id, newCatId, oldCatId, opts) => {
          setWidgets(prev => prev.map(w => {
            if (w.id !== id) return w;
            const updated = { ...w, options: opts || w.options };
            if (newCatId !== undefined && newCatId !== oldCatId) {
              updated.categoryId = newCatId;
              updated.x = 0; updated.y = 0; updated.categoryX = 0; updated.categoryY = 0;
            }
            return updated;
          }));
        }}
      />
      <ShareDashboardDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog} 
        dashboardId={dashboard.id} 
      />
    </div>
  );
}