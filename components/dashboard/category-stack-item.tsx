"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Category, Widget } from "@/lib/db/schema";
import { GridStackWrapper, GridItem } from "@/components/gridstack/grid-stack-wrapper";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { cn } from "@/lib/utils";
import { Folder, GripVertical, ChevronDown, ChevronRight, Edit2, Trash2, X, Check, Plus, LogOut, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EmojiPicker from "@/components/ui/emoji-picker";
import { updateCategory, deleteCategory, toggleCategoryCollapse } from "@/lib/actions/categories";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-context";

interface CategoryStackItemProps {
  category: Category;
  widgets: Widget[];
  isCollapsed: boolean;
  isEditMode: boolean;
  isCtrlPressed?: boolean; // Prop passée par le parent
  onWidgetEdit: (widget: Widget) => void;
  onWidgetDelete: (widgetId: string) => void;
  // Callback when a widget is added/removed/moved within this category
  onLayoutChange: (categoryId: string, widgets: Array<{id: string, x: number, y: number, w: number, h: number}>) => void;
  onToggleCollapse?: (isCollapsed: boolean) => void;
  onWidgetDropIn?: (widgetId: string, categoryId: string) => void;
  onWidgetDropOut?: (widgetId: string) => void;
}

export function CategoryStackItem({
  category,
  widgets,
  isCollapsed: initialCollapsed = false,
  isEditMode,
  onWidgetEdit,
  onWidgetDelete,
  onLayoutChange,
  onToggleCollapse,
  onWidgetDropIn,
  onWidgetDropOut,
}: CategoryStackItemProps) {
  const confirm = useConfirm();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { isDragging, draggedWidget, endDrag, sourceCategoryId } = useCrossGridDrag();
  const [isHovered, setIsHovered] = useState(false);
  
  // Synchroniser l'état local avec la prop quand elle change
  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);
  
  // Edit State
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon || "📁");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcul dynamique de la largeur
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(Math.max(width - 32, 300)); // Soustraction du padding
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Détection de l'état Ctrl/Cmd pour permettre le dragOut
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
        document.body.classList.add('ctrl-pressed');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
        document.body.classList.remove('ctrl-pressed');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsCtrlPressed(false);
        document.body.classList.remove('ctrl-pressed');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const gridOptions = useMemo(() => ({
    column: 12,
    acceptWidgets: '.grid-stack-item',
    cellHeight: 50, // Légèrement plus petit que le principal (60) pour distinction
    animate: true,
    float: !isCtrlPressed, // PAS de float en mode Ctrl+clic
    margin: 6, // Configuration harmonisée
    minRow: 1,
    disableOneColumnMode: false,
    dragOut: isCtrlPressed, // SEULEMENT avec Ctrl+clic
    disableResize: !isEditMode,
    disableDrag: !isEditMode,
    removable: isCtrlPressed ? '.grid-stack-item' : false,
    // Configuration simplifiée pour éviter les conflits
    handle: isEditMode ? '.widget-drag-handle' : undefined, // Seule la poignée de drag
    resizeHandles: 'se', // Seulement coin SE pour éviter conflits
    // Configuration standard pour TOUS les widgets
    minW: 1, // Permet resize libre pour widgets link/link-ping
    minH: 1, // Permet resize libre pour widgets link/link-ping
    maxW: 12, // Maximum de la grille
    maxH: 20, // Limite raisonnable
  }), [isEditMode, isCtrlPressed]);

  // Transform widgets to GridItems pour GridStack
  const initialItems: GridItem[] = widgets.map(w => ({
    id: `widget-${w.id}`,
    x: w.categoryX || 0,
    y: w.categoryY || 0,
    w: w.w || 3, // Taille par défaut standard
    h: w.h || 3, // Taille par défaut standard
    minW: 1, // Permet resize libre pour widgets link/link-ping
    minH: 1, // Permet resize libre pour widgets link/link-ping
    type: w.type,
    data: w 
  }));

  const handleGridLayoutChange = (items: GridItem[]) => {
    if (!isEditMode || !onLayoutChange) return;
    const updates = items.map((item) => ({
      id: item.data?.id || item.id.replace('widget-', ''),
      x: item.x || 0,
      y: item.y || 0,
      w: item.w || 1,
      h: item.h || 1,
    }));
    onLayoutChange(category.id, updates);
  };

  const handleDrop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isDragging || !draggedWidget) return;

    const isExiting = sourceCategoryId === category.id;
    const isEntering = sourceCategoryId !== category.id;

    const result = endDrag();
    if (!result) return;

    if (isEntering && onWidgetDropIn) onWidgetDropIn(result.widget.id, category.id);
    else if (isExiting && onWidgetDropOut) onWidgetDropOut(result.widget.id);

    setIsHovered(false);
  };

  const isValidDropTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId !== category.id;
  const isValidExitTarget = isEditMode && isDragging && draggedWidget && sourceCategoryId === category.id;
  const showOverlay = (isValidDropTarget || isValidExitTarget) && isHovered;
  const handleToggleCollapse = async (targetState?: boolean) => {
      const newState = targetState !== undefined ? targetState : !isCollapsed;
      if (newState === isCollapsed) return;

      // Animation simplifiée pour éviter les conflits
      setIsCollapsed(newState);
      
      // Notification directe sans requestAnimationFrame pour éviter les retards
      if (onToggleCollapse) {
        onToggleCollapse(newState);
      }

      try {
          await toggleCategoryCollapse(category.id, newState);
      } catch (e) {
          // Revert simple sans animation complex
          setIsCollapsed(!newState);
          if (onToggleCollapse) {
            onToggleCollapse(!newState);
          }
      }
  };

  // Drag over header to open
  const handleHeaderMouseEnter = () => {
     if (!isEditMode || !isCollapsed) return;
     // If we are dragging something (heuristically, can check global state if available, or just check 'isEditMode' + assume user intnet)
     // To be safe, let's wait 600ms. If mouse still there, open.
     hoverTimeoutRef.current = setTimeout(() => {
          handleToggleCollapse(false); // Open
     }, 600);
  };

  const handleHeaderMouseLeave = () => {
     if (hoverTimeoutRef.current) {
         clearTimeout(hoverTimeoutRef.current);
         hoverTimeoutRef.current = null;
     }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        await updateCategory(category.id, {
            name,
            icon,
        });
        setShowEditDialog(false);
        window.location.reload(); 
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async () => {
      if (await confirm("Supprimer cette catégorie ? Les widgets seront déplacés vers la grille principale.")) {
          await deleteCategory(category.id);
          window.location.reload();
      }
  };

  return (
    <>    
    <div 
      ref={containerRef}
      className={cn(
        "h-full w-full flex flex-col bg-card/60 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md relative",
        isCollapsed ? "h-auto min-h-[140px] max-h-[140px]" : "row-span-2", // Hauteur réduite mais suffisante pour le header
        showOverlay ? "ring-2 ring-primary ring-offset-2 scale-[1.005]" : "hover:shadow-md"
      )}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      
      {/* ZONE DE DROP (z-index max pour passer au dessus de tout) */}
      {showOverlay && (
        <div 
          className="absolute inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in duration-200 border-2 border-dashed border-primary rounded-xl cursor-copy"
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
       {/* Header - Design Moderne avec Glassmorphism */}
       <div 
          className={cn(
              "relative flex items-center justify-between p-4 select-none group transition-all duration-300 ease-in-out",
              "bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-xl",
              "border-b border-white/[0.08] dark:border-white/[0.05]",
              !isEditMode && "cursor-pointer hover:bg-gradient-to-r hover:from-background/90 hover:to-background/70",
              "before:absolute before:inset-0 before:rounded-t-xl before:bg-gradient-to-r",
              "before:from-primary/[0.03] before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
              "hover:before:opacity-100 shadow-sm hover:shadow-md",
              isCtrlPressed && isEditMode && "ring-2 ring-orange-400 ring-offset-1 bg-orange-50/20" // Indicateur Ctrl+clic
          )}
          onClick={(e) => {
              // Si on est en mode Ctrl+clic ou si on clique sur un bouton/élément interactif, ne pas toggle
              if (isCtrlPressed || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.stop-propagation')) return;
              handleToggleCollapse();
          }}
          onMouseEnter={handleHeaderMouseEnter}
          onMouseLeave={handleHeaderMouseLeave}
          onMouseUp={(e) => {
              // Empêcher l'interaction avec l'header pendant le drag de widgets
              if (isCtrlPressed || document.body.classList.contains('ui-draggable-dragging') || document.querySelector('.grid-stack-item.ui-draggable-dragging')) {
                  e.stopPropagation();
                  return false;
              }
          }}
          data-droppable="true"
          data-category-id={category.id}
       >
           {/* Barre d'accent latérale animée */}
           <div className={cn(
             "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-500 ease-out",
             isCollapsed ? "bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20 shadow-sm" : "bg-gradient-to-b from-primary to-primary/70 shadow-lg shadow-primary/20"
           )} />

           {/* Effet de surbrillance au hover */}
           <div className="absolute inset-0 rounded-t-xl bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
           
           <div className="flex items-center gap-4 relative z-10 w-full">
               {/* Drag Handle - Avec blocage Ctrl+clic TOTAL */}
               {isEditMode && (
                   <div 
                     className={cn(
                       "p-2 rounded-lg hover:bg-white/[0.08] dark:hover:bg-white/[0.05] drag-handle-category stop-propagation text-muted-foreground/60 hover:text-foreground/80 transition-all duration-200",
                       "cursor-grab active:cursor-grabbing"
                     )}
                     onPointerDown={(e) => {
                       // BLOCAGE TOTAL en Ctrl+clic
                       if (e.ctrlKey || e.metaKey) {
                         e.preventDefault();
                         e.stopPropagation();
                         return false;
                       }
                     }}
                     onMouseDown={(e) => {
                       if (e.ctrlKey || e.metaKey) {
                         e.preventDefault();
                         e.stopPropagation();
                         return false;
                       }
                     }}
                     style={{
                       pointerEvents: 'auto'
                     }}
                   >
                      <GripVertical className="w-4 h-4" />
                   </div>
               )}
               
               <div className="flex items-center gap-3 flex-1 min-w-0">
                 {/* Icône et nom de la catégorie - Sans chevron */}
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                        "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                        "bg-gradient-to-br from-background to-background/80 border border-border/40 shadow-sm",
                        "group-hover:shadow-md group-hover:border-border/60 group-hover:scale-105",
                        !isCollapsed && "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
                    )}>
                      <span className="text-lg leading-none filter drop-shadow-sm">{category.icon || "📁"}</span>
                      {!isCollapsed && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-foreground/90 truncate group-hover:text-foreground transition-colors">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          isCollapsed ? "bg-muted-foreground/40" : "bg-primary animate-pulse"
                        )} />
                        <p className="text-xs text-muted-foreground/70 font-medium">
                          {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'}
                          {!isCollapsed && widgets.length > 0 && (isEditMode ? 
                            (isCtrlPressed ? ' - Mode extraction (Ctrl+drag pour sortir)' : ' - Mode édition')
                            : ' - Actifs'
                          )}
                        </p>
                      </div>
                    </div>
                 </div>

                 {/* Badge de comptage stylisé */}
                 <div className={cn(
                   "flex items-center justify-center min-w-[2.5rem] h-8 rounded-full transition-all duration-300",
                   "bg-gradient-to-r from-background/80 to-background/60 border border-border/40 shadow-sm",
                   "group-hover:shadow-md group-hover:scale-105",
                   widgets.length > 0 && "bg-primary/10 border-primary/30 text-primary font-semibold"
                 )}>
                   <span className="text-sm font-bold tracking-tight px-2">
                     {widgets.length}
                   </span>
                 </div>
               </div>
           </div>
           
           {/* Boutons d'action avec meilleur styling */}
           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
               {isEditMode && (
                   <>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-8 w-8 stop-propagation rounded-lg hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all duration-200" 
                     onClick={() => setShowEditDialog(true)}
                   >
                       <Edit2 className="w-4 h-4" />
                   </Button>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-8 w-8 stop-propagation rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all duration-200" 
                     onClick={handleDelete}
                   >
                       <Trash2 className="w-4 h-4" />
                   </Button>
                   </>
               )}
           </div>
       </div>

       {/* Zone de contenu avec animation simplifiée */}
       <div className={cn(
           "flex-1 relative rounded-b-xl overflow-hidden transition-all duration-300 ease-in-out",
           isCollapsed ? (
             "max-h-0 opacity-0 pointer-events-none"
           ) : (
             "max-h-[2000px] opacity-100 min-h-[160px]"
           )
       )}>
           {/* Arrière-plan dégradé sophistiqué */}
           <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-transparent pointer-events-none" />
           <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] to-transparent pointer-events-none" />
           
           {/* Zone de drop stylisée - Visible en mode édition */}
           {!isCollapsed && isEditMode && widgets.length === 0 && (
               <div className="absolute inset-2 border-2 border-dashed border-primary/30 rounded-xl pointer-events-none z-0 flex items-center justify-center transition-all duration-300 bg-primary/[0.02] backdrop-blur-sm">
                   <div className="text-center space-y-2">
                     <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                       <Plus className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                       <span className="text-primary/60 text-sm font-semibold uppercase tracking-wider block">Zone de dépôt</span>
                       <p className="text-muted-foreground/50 text-xs font-medium mt-1">Glissez vos widgets ici</p>
                     </div>
                   </div>
               </div>
           )}

           {/* Container GridStack moderne */}
           <div 
               className={cn(
                   "h-full w-full grid-stack-nested-container p-3 relative z-10"
                   // Pas de pointer-events: none car cela casse le resize/drag des widgets
               )}
           >
                <GridStackWrapper
                    className="grid-stack-nested"
                    initialItems={initialItems}
                    isEditMode={isEditMode}
                    options={gridOptions}
                    renderItem={(item) => (
                         <div 
                             className="h-full w-full widget-item-container"
                         >
                                <WidgetComponent 
                                    widget={item.data as Widget} 
                                    isEditMode={isEditMode}
                                    onEdit={() => onWidgetEdit(item.data as Widget)}
                                    onDelete={() => onWidgetDelete((item.data as Widget).id)}
                                />
                         </div>
                    )}
                    onLayoutChange={handleGridLayoutChange}
                />
             </div>
       </div>
    </div>

    {/* Edit Dialog */}
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Modifier la catégorie</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Nom</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label>Icône</Label>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="text-3xl border p-2 rounded-md min-w-[3rem] text-center">{icon}</div>
                            <Button 
                                variant="outline" 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                {showEmojiPicker ? "Fermer" : "Choisir..."}
                            </Button>
                        </div>
                        
                        {showEmojiPicker && (
                            <div className="border rounded-md p-2">
                                <EmojiPicker onSelect={(emoji: string) => {
                                    setIcon(emoji);
                                    setShowEmojiPicker(false);
                                }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setShowEditDialog(false)} variant="ghost">Annuler</Button>
                <Button onClick={handleSave} disabled={loading}>Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
