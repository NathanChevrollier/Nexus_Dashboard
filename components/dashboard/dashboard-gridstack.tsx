"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Dashboard, Widget, Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Save, Plus, BarChart3, Layers, Calendar, Edit, Share2 } from "lucide-react";
import { GridStackWrapper, GridItem } from "@/components/gridstack/grid-stack-wrapper";
import { CategoryStackItem } from "@/components/dashboard/category-stack-item";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { updateWidgetPositions, deleteWidget } from "@/lib/actions/widgets";
import { updateCategoryPositions, deleteCategory, toggleCategoryCollapse as toggleCategoryCollapseAction } from "@/lib/actions/categories";
import { useAlert } from "@/components/ui/confirm-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { CrossGridDragProvider, useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-context";
// Import other dialogs... (keeping original functionality)
import { AddWidgetDialogModern } from "@/components/dashboard/add-widget-dialog-modern"; 
import { AddCategoryDialog } from "@/components/dashboard/add-category-dialog";
import { EditWidgetDialog } from "@/components/dashboard/edit-widget-dialog";
import { ShareDashboardDialog } from "@/components/dashboard/share-dashboard-dialog";

interface DashboardGridstackProps {
  dashboard: Dashboard;
  isOwner: boolean;
  initialWidgets?: Widget[];
  initialCategories?: Category[];
}

export function DashboardGridstack({ 
  dashboard, 
  isOwner, 
  initialWidgets = [], 
  initialCategories = [] 
}: DashboardGridstackProps) {
  return (
    <CrossGridDragProvider>
      <DashboardGridstackInner
        dashboard={dashboard}
        isOwner={isOwner}
        initialWidgets={initialWidgets}
        initialCategories={initialCategories}
      />
    </CrossGridDragProvider>
  );
}

function DashboardGridstackInner({ 
  dashboard, 
  isOwner, 
  initialWidgets = [], 
  initialCategories = [] 
}: DashboardGridstackProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => 
    new Set(initialCategories.filter(c => c.isCollapsed).map(c => c.id))
  );
  
  const { isDragging, draggedWidget, cancelDrag } = useCrossGridDrag();
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  
  // Détection globale du Ctrl+clic pour le dashboard principal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const handleVisibilityChange = () => {
      if (document.hidden) setIsCtrlPressed(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Clock
  useEffect(() => {
    setCurrentTime(new Date()); 
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = () => {
    if (!currentTime) return "...";
    return currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  };

  const formatTime = () => {
    if (!currentTime) return "...";
    return currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const alert = useAlert();
  const confirm = useConfirm();

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

  // --- PREPARE DATA FOR GRIDSTACK ---
  // Main Grid contains: 
  // 1. Widgets that have NO categoryId
  // 2. Categories themselves used as items
  
  const getMainGridItems = useCallback((): GridItem[] => {
      const widgetItems: GridItem[] = widgets
          .filter(w => !w.categoryId)
          .map(w => ({
              id: `widget-${w.id}`,
              x: w.x || 0,
              y: w.y || 0,
              w: w.w || 3, // Taille par défaut standard
              h: w.h || 3, // Taille par défaut standard
              minW: 1, // Permet resize libre pour widgets link/link-ping
              minH: 1, // Permet resize libre pour widgets link/link-ping
              type: w.type,
              data: w
          }));
      
      const categoryItems: GridItem[] = categories.map(c => ({
          id: `cat-${c.id}`,
          x: c.x || 0,
          y: c.y || 0,
          w: c.w || 6, // Taille par défaut améliorée pour les catégories
          h: c.isCollapsed ? 1 : (c.h || 4), // Handle collapsed state
          minW: 4, // Minimum plus généreux
          minH: 1, // Permet la fermeture complète (était 3)
          type: 'category',
          data: c
      }));

      return [...widgetItems, ...categoryItems];
  }, [widgets, categories]);

  // --- HANDLERS ---

  const handleMainLayoutChange = (items: GridItem[]) => {
      // Update local state without saving to DB yet
      // We need to parse items to separate widgets and categories
      
      const updatedWidgets: Partial<Widget>[] = [];
      const updatedCategories: Partial<Category>[] = [];

      items.forEach(item => {
          if (item.id.startsWith('widget-')) {
              const id = item.id.replace('widget-', '');
              // Find original to keep other props?
              updatedWidgets.push({ id, x: item.x, y: item.y, w: item.w, h: item.h });
          } else if (item.id.startsWith('cat-')) {
              const id = item.id.replace('cat-', '');
              updatedCategories.push({ id, x: item.x, y: item.y, w: item.w, h: item.h });
          }
      });

      // Merge with state
      setWidgets(prev => prev.map(w => {
          const update = updatedWidgets.find(u => u.id === w.id);
          // If the widget is found in the main grid items, it means it is now in the main grid (not in a category)
          // So we MUST explicitly set categoryId to null.
          return update ? { ...w, ...update, categoryId: null } : w;
      }));

      setCategories(prev => prev.map(c => {
          const update = updatedCategories.find(u => u.id === c.id);
          if (update) {
              // Vital Fix: If category is collapsed, the GridStack item reports height=1.
              // We must NOT overwrite the stored 'expanded' height (c.h) with 1.
              // We only update H if it's NOT collapsed, OR if we decide to track collapsed height (which is usually fixed to 1).
              // Let's preserve the original H if collapsed.
              const newH = c.isCollapsed ? c.h : (update.h ?? c.h);
              
              return { ...c, ...update, h: newH };
          }
          return c;
      }));
  };

  const handleCategoryLayoutChange = useCallback((categoryId: string, items: GridItem[]) => {
     // Check for widgets that were moved here (or just moved inside)
     setWidgets(prev => {
         // Create a map for faster lookup if items list is large
         const itemsMap = new Map(items.filter(i => i.id.startsWith('widget-')).map(i => [i.id.replace('widget-', ''), i]));
         
         if (itemsMap.size === 0 && !prev.some(w => w.categoryId === categoryId)) return prev;

         // We only update widgets that adhere to THIS category OR widgets that are IN the items list (just dragged in)
         return prev.map(w => {
             const item = itemsMap.get(w.id);
             
             // If widget is in the update list, it belongs to this category now
             if (item) {
                 // Force update categoryId even if it seems the same, to ensure sync
                 return { 
                     ...w, 
                     categoryId: categoryId,
                     categoryX: item.x || 0,
                     categoryY: item.y || 0,
                     // Ensure W/H are synced if they changed during drag
                     w: item.w || w.w, 
                     h: item.h || w.h
                 };
             }
             
             return w;
         });
     });
  }, []); // Empty dependency thanks to functional state update

  const handleCategoryCollapseToggled = useCallback((categoryId: string, isCollapsed: boolean) => {
      // Direct DOM manipulation
      const mainGrid = document.querySelector('.grid-stack-main') as any;
      if (!mainGrid?.gridstack) return;
      
      const grid = mainGrid.gridstack;
      const el = grid.getGridItems().find((x: any) => x.getAttribute('gs-id') === `cat-${categoryId}`);
      
      if (!el) return;

      if (isCollapsed) {
          // CLOSING SEQUENCE
          // 1. Immediately update React state to hidden (triggers CSS transition)
          setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isCollapsed: true } : c));
          
          // 2. Wait for transition to complete, THEN compact the grid
          setTimeout(() => {
              grid.batchUpdate();
              grid.update(el, { h: 1, minH: 1 }); // Fixes widgets below not moving up
              grid.batchUpdate(false);
          }, 350); // 300ms css + 50ms buffer
      } else {
          // OPENING SEQUENCE
          // 1. Expand grid FIRST to clear space (Widgets below move down)
          // Try to recover original height if possible, else default
          const cat = categories.find(c => c.id === categoryId);
          const targetH = (cat && cat.h > 1) ? cat.h : 4; 
          
          grid.batchUpdate();
          grid.update(el, { h: targetH, minH: 2 });
          grid.batchUpdate(false);
          
          // 2. Reveal content slightly after space is made
          // (No delay needed really, but ensures DOM flow)
          requestAnimationFrame(() => {
                setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isCollapsed: false } : c));
          });
      }
  }, [categories]);

  // LISTEN FOR PORTAL DROPS
  useEffect(() => {
      const handlePortalDrop = (e: any) => {
          const { widgetId, categoryId } = e.detail;
          console.log("Processing Portal Drop:", widgetId, "->", categoryId);
          
          // Update Widget Data
          setWidgets(prev => {
              const widget = prev.find(w => w.id === widgetId);
              if (!widget) return prev;
              if (widget.categoryId === categoryId) return prev; // Already there

              // Move logic
              return prev.map(w => {
                  if (w.id === widgetId) {
                      return { ...w, categoryId: categoryId, categoryX: 0, categoryY: 0 };
                  }
                  return w;
              });
          });
          
          // Force Remove from Main Grid DOM (GridStack sometimes lingers)
          const mainGrid = document.querySelector('.grid-stack-main') as any;
          if (mainGrid?.gridstack) {
               const el = mainGrid.gridstack.getGridItems().find((x: any) => x.getAttribute('gs-id') === `widget-${widgetId}`);
               if (el) {
                   mainGrid.gridstack.removeWidget(el, false); // Remove from grid logic, let React handle DOM
               }
          }
      };

      window.addEventListener('widget-portal-drop', handlePortalDrop);
      return () => window.removeEventListener('widget-portal-drop', handlePortalDrop);
  }, []);

  const saveLayout = async () => {
      setIsSaving(true);
      try {
          // Prepare updates for DB
          const widgetUpdates = widgets.map(w => ({
             id: w.id,
             x: w.x, y: w.y, w: w.w, h: w.h,
             categoryId: w.categoryId,
             categoryX: w.categoryX ?? undefined,
             categoryY: w.categoryY ?? undefined
          }));
          
          const categoryUpdates = categories.map(c => ({
             id: c.id, x: c.x, y: c.y, w: c.w, h: c.h
          }));

          await Promise.all([
             updateWidgetPositions(widgetUpdates),
             updateCategoryPositions(categoryUpdates)
          ]);
          
          setIsEditMode(false);
      } catch (err) {
          console.error(err);
          alert("Erreur lors de la sauvegarde.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleWidgetDelete = async (id: string) => {
      if (await confirm("Supprimer ce widget ?")) {
          await deleteWidget(id);
          setWidgets(prev => prev.filter(w => w.id !== id));
      }
  };



  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-background">
       {/* Toolbar */}
       <div className="h-[80px] p-4 border-b bg-background/95 backdrop-blur z-20 sticky top-0 shadow-sm relative flex items-center justify-between">
        <div className="flex items-center h-full z-10 relative pointer-events-auto">
          <div className="w-1.5 h-12 bg-primary rounded-full mr-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
              {dashboard.name}
            </h1>
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                <Layers className="h-3 w-3 text-primary" /> {widgets.length} widgets
              </span>
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                <BarChart3 className="h-3 w-3 text-primary" /> {categories.length} catégories
              </span>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] flex items-center gap-1.5 uppercase mb-1">
              <Calendar className="h-3 w-3" /> {formatDate()}
            </span>
            <span className="text-4xl font-black tabular-nums tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground/20">
              {formatTime()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 z-10 relative pointer-events-auto">
          {isOwner && (
            <div className="flex items-center gap-2 pl-6 border-l h-10">
              <Button 
                 variant="outline" 
                 className="gap-2 font-semibold hover:border-primary/50 transition-colors"
                 onClick={() => setShowShareDialog(true)}
              >
                  <Share2 className="h-4 w-4" /> Partager
              </Button>

              {!isEditMode ? (
                <Button 
                  onClick={() => setIsEditMode(true)}
                  className="gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                >
                  <Edit className="h-4 w-4" /> Personnaliser
                </Button>
              ) : (
                <>
                   <Button variant="outline" size="icon" onClick={() => setShowAddDialog(true)} title="Ajouter Widget">
                       <Plus className="w-4 h-4" />
                   </Button>
                   <Button variant="outline" size="icon" onClick={() => setShowAddCategoryDialog(true)} title="Ajouter Catégorie">
                       <Layers className="w-4 h-4" />
                   </Button>
                   <Button 
                      onClick={saveLayout} 
                      disabled={isSaving}
                      className={isSaving ? "opacity-80" : "animate-in fade-in zoom-in duration-300"}
                    >
                       <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                   </Button>
                </>
              )}
            </div>
          )}
        </div>
       </div>
       
       {/* Main Grid Area */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-muted/10 grid-stack-main-container">
           <GridStackWrapper
               className="grid-stack-main min-h-[500px]" 
               initialItems={getMainGridItems()}
               isEditMode={isEditMode}
               options={useMemo(() => ({
                   column: 12, 
                   cellHeight: 60, // Configuration unifiée avec grid-stack-wrapper
                   minRow: 1,
                   animate: true,
                   float: !isDragging || !isCtrlPressed,
                   acceptWidgets: '.grid-stack-item',
                   margin: 6, // Configuration unifiée avec grid-stack-wrapper
                   disableOneColumnMode: false,
                   // Configuration standard pour TOUS les widgets
                   minW: 1, // Permet resize libre pour widgets link/link-ping
                   minH: 1, // Permet resize libre pour widgets link/link-ping
                   maxW: 12, // Maximum de la grille
                   maxH: 20, // Limite raisonnable
               }), [isDragging, isCtrlPressed])}
               onLayoutChange={handleMainLayoutChange}
               renderItem={(item) => {
                   if (item.type === 'category') {
                       const cat = item.data as Category;
                       const catWidgets = widgets.filter(w => w.categoryId === cat.id);
                       return (
                           <CategoryStackItem
                              category={cat}
                              widgets={catWidgets}
                              isCollapsed={collapsedCategories.has(cat.id)}
                              isEditMode={isEditMode}
                              isCtrlPressed={isCtrlPressed}
                              onWidgetEdit={(w) => { setEditingWidget(w); setShowEditDialog(true); }}
                              onWidgetDelete={handleWidgetDelete}
                              onLayoutChange={handleCategoryLayoutChange}
                              onToggleCollapse={(collapsed) => handleCategoryCollapseToggled(cat.id, collapsed)}
                              onWidgetDropIn={(widgetId, categoryId) => {
                                setWidgets(prev => prev.map(w => 
                                  w.id === widgetId ? { ...w, categoryId, x: 0, y: 0, categoryX: 0, categoryY: 0 } : w
                                ));
                              }}
                              onWidgetDropOut={(widgetId) => {
                                setWidgets(prev => prev.map(w => 
                                  w.id === widgetId ? { ...w, categoryId: null, x: 0, y: 0 } : w
                                ));
                              }}
                           />
                       );
                   } else {
                       return (
                           <WidgetComponent
                              widget={item.data as Widget}
                              isEditMode={isEditMode}
                              onEdit={() => { setEditingWidget(item.data as Widget); setShowEditDialog(true); }}
                              onDelete={() => handleWidgetDelete((item.data as Widget).id)}
                           />
                       );
                   }
               }}
           />
       </div>

       {/* Dialogs */}
       <AddWidgetDialogModern 
          open={showAddDialog} 
          onOpenChange={setShowAddDialog}
          dashboardId={dashboard.id}
          isEditMode={isEditMode}
          onWidgetAdded={() => window.location.reload()} // For now simple reload
       />
       <AddCategoryDialog
          open={showAddCategoryDialog}
          onOpenChange={setShowAddCategoryDialog}
          dashboardId={dashboard.id}
          isEditMode={isEditMode}
          onCategoryAdded={() => window.location.reload()}
       />
       {editingWidget && (
           <EditWidgetDialog
               open={showEditDialog}
               onOpenChange={setShowEditDialog}
               widget={editingWidget}
               onWidgetUpdated={() => window.location.reload()}
               categories={categories}
               widgets={widgets}
           />
       )}
       <ShareDashboardDialog 
         open={showShareDialog} 
         onOpenChange={setShowShareDialog} 
         dashboardId={dashboard.id} 
       />
    </div>
  );
}
