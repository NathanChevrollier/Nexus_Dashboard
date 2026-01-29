"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GridStack, GridStackOptions, GridStackWidget, GridStackElement, GridStackNode } from 'gridstack';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

export interface GridItem extends GridStackWidget {
  id: string; // Enforce ID
  type?: string; // To distinguish categories vs widgets
  children?: any; // For React rendering content
  data?: any; // Generic data holder
}

interface GridStackWrapperProps {
  initialItems: GridItem[];
  options?: GridStackOptions;
  onLayoutChange?: (items: GridItem[]) => void;
  renderItem: (item: GridItem) => React.ReactNode;
  className?: string;
  isEditMode?: boolean; 
}

export type GridStackHandle = {
  getGrid: () => GridStack | undefined;
  addWidget: (item: GridItem) => void;
  removeWidget: (id: string) => void;
  save: () => GridItem[];
};

export const GridStackWrapper = forwardRef<GridStackHandle, GridStackWrapperProps>(
  ({ initialItems, options, onLayoutChange, renderItem, className, isEditMode = true }, ref) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const gridInstance = useRef<GridStack>(null);
    // We keep a local state of items to render React components
    // BUT we must be careful not to trigger full re-renders that destroy DOM nodes managed by Gridstack
    const [elements, setElements] = useState<GridItem[]>(initialItems);
    
    // Lock to prevent React updates during GridStack interactions
    const isInteracting = useRef(false);

    // Initialize Gridstack
    // Use stringified options to prevent re-init on every render if options object reference changes but content is same
    const serializedOptions = JSON.stringify(options);

    useEffect(() => {
      if (!gridRef.current) return;
      
      // Double check cleanup status
      if (gridInstance.current) {
         try { gridInstance.current.destroy(false); } catch(e) {};
         gridInstance.current = null;
      }
      
      // --- CRASH FIX START ---
      // Monkey-patch removeChild to prevent React from crashing when it tries to remove a DOM node
      // that GridStack has already moved to another grid container.
      if (gridRef.current) {
          const originalRemoveChild = gridRef.current.removeChild;
          gridRef.current.removeChild = function(child: Node) {
              if (this !== child.parentNode) {
                  return child; 
              }
              return originalRemoveChild.call(this, child);
          } as any;
      }
      // --- CRASH FIX END ---

      try {
          const grid = GridStack.init({
            column: 12,
            cellHeight: 60, // Configuration unifiée
            animate: true, 
            float: true,
            acceptWidgets: true, 
            removable: false, // We handle removal via React usually
            margin: 6, // Configuration unifiée
            disableResize: !isEditMode,
            disableDrag: !isEditMode,
            // Handle simplifié pour éviter les conflits resize/drag
            handle: isEditMode ? '.widget-drag-handle' : false, // Seule la poignée de drag
            resizeHandles: 'se', // Seulement coin SE pour éviter conflits
            // Disable native margin option if we control it via CSS to avoid conflicts
            // OR use it but understand it might conflict with our absolute positioning
            // margin: 0, 
            marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
            ...options,
          }, gridRef.current);

          gridInstance.current = grid;
          
          // --- EVENT LISTENERS FOR INTERACTION LOCK ---
          grid.on('dragstart resizestart', () => { isInteracting.current = true; });
          grid.on('dragstop resizestop', () => { 
               // Small delay to allow final updates to process before unlocking
               setTimeout(() => { isInteracting.current = false; }, 300); 
          });

          const handleChange = (event: Event, nodes: GridStackNode[]) => {
              if (onLayoutChange) {
                  // Must defer to avoid "ResizeObserver loop limit exceeded" or Layout Trash
                  // Use a slightly longer timeout to let animations settle
                   setTimeout(() => {
                       const instance = gridInstance.current;
                       if (!instance || !instance.engine) return; // double check engine exists
                       
                       // Check if component is still mounted/valid
                       if (gridRef.current) {
                           const currentData = instance.save(false) as GridItem[];
                           onLayoutChange(currentData);
                       }
                   }, 50); 
              }
          };

          // Handle Change (Drag/Resize) - ONLY save layout
          grid.on('change', (event: Event, nodes: GridStackNode[]) => {
            if (!nodes?.length) return; 

            if (onLayoutChange) {
               // element's x/y has changed.
               setTimeout(() => {
                   const instance = gridInstance.current;
                   if (!instance || !instance.engine) return; 
                   if (!gridRef.current) return;

                   const currentData = instance.save(false) as GridItem[];
                   onLayoutChange(currentData);
               }, 200); // Increased debounce to be safe
            }
          });

          // --- DROP PORTAL DETECTION ---
          // Since GridStack pushes items away, we can't easily drop *on* a category.
          // BUT, we can detect if the drop happened near/over a category using elementFromPoint strategy.
          grid.on('dragstop', (event: Event, el: GridStackElement) => {
              // 1. Get the cursor position or the element position
              // Since DragStop gives us the element, we can check its bounding rect for the center
              const rect = el.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              
              // 2. Hide element temporarily to see what's underneath
              const originalDisplay = el.style.display; 
              el.style.display = 'none'; // Use display:none to ensure we pierce through
              const elementBelow = document.elementFromPoint(centerX, centerY);
              el.style.display = originalDisplay;

              // 3. Check if elementBelow is a Category Header or Drop Zone
              // We look for [data-droppable="true"] which we added to CategoryStackItem header
              const droppable = elementBelow?.closest('[data-droppable="true"]');
              if (droppable) {
                  const targetCatId = droppable.getAttribute('data-category-id');
                  // Ensure we are dragging a widget, not a category
                  const widgetId = el.getAttribute('gs-id')?.replace('widget-', '');
                  const isWidget = el.getAttribute('gs-id')?.startsWith('widget-');
                  
                  if (targetCatId && widgetId && isWidget) {
                      // Trigger Custom Event for the Dashboard implementation to pick up
                      const customEvent = new CustomEvent('widget-portal-drop', {
                          detail: { widgetId, categoryId: targetCatId }
                      });
                      window.dispatchEvent(customEvent);
                  }
              }

              // Release Lock
              setTimeout(() => { isInteracting.current = false; }, 300); 
          });
          
          // Handle Resize Stop
          grid.on('resizestop', (event: Event, el: GridStackElement) => {
              // Logique de carré forcé supprimée pour permettre resize libre des widgets link
              // Tous les widgets peuvent maintenant être redimensionnés librement
          });

          // Handle Added - When dropped from another grid
          grid.on('added', (event: Event, nodes: GridStackNode[]) => {
               if (onLayoutChange) {
                   setTimeout(() => {
                       const instance = gridInstance.current;
                       if (!instance || !gridRef.current) return;
                       const currentData = instance.save(false) as GridItem[];
                       onLayoutChange(currentData);
                   }, 100);
               }
          });

      } catch (e) {
         console.warn("GridStack Init Warning:", e);
      }
      
      // Cleanup
      return () => {
         if (gridInstance.current) {
             const grid = gridInstance.current;
             // Unbind all events to prevent them firing during destroy
             grid.off('change');
             grid.off('added');
             grid.off('dragstart');
             grid.off('dragstop');
             grid.off('resizestart');
             grid.off('resizestop');
             
             try {
                grid.destroy(false); // false = don't remove DOM nodes (React handles them)
             } catch (e) {
                // Silently ignore destruction errors (common with Hot Reload or rapid unmounting)
             }
             gridInstance.current = null;
         }
      };
    }, [serializedOptions, isEditMode]); // Re-init if options deeply change (be careful here)

    // Sync React Elements with Gridstack when props change
    useEffect(() => {
        const grid = gridInstance.current;
        if (!grid) return;
        
        // --- CRITICAL FIX: DO NOT SYNC FROM REACT WHILE USER IS INTERACTING ---
        if (isInteracting.current) return;

        // Check for structural changes (add/remove)
        const ids = elements.map(e => e.id).join(',');
        const newIds = initialItems.map(e => e.id).join(',');
        
        if (ids !== newIds || elements.length !== initialItems.length) {
             // CLEANUP: If an item is in elements (old) but not in initialItems (new), we must remove it from GridStack
             // This happens when a widget is moved OUT of this grid to another.
             // GridStack DOM might still have it if drag logic failed or if React update was faster.
             elements.forEach(oldItem => {
                 if (!initialItems.find(newItem => newItem.id === oldItem.id)) {
                      // Item removed
                      const el = grid.getGridItems().find(n => n.gridstackNode?.id === oldItem.id);
                      if (el) {
                          try {
                             grid.removeWidget(el, false); // false = keep DOM (React will unmount it)
                          } catch(e) {}
                      }
                 }
             });

             setElements(initialItems);
             return;
        }

        // Check for geometric updates (e.g. collapse toggle changed h)
        // We only care about W and H updates driven by external props (like Category Collapse)
        initialItems.forEach(item => {
            const el = grid.getGridItems().find(n => n.gridstackNode?.id === item.id);
            if (el && el.gridstackNode) {
                const node = el.gridstackNode;
                if (item.h !== undefined && node.h !== item.h) {
                    grid.update(el, { h: item.h });
                }
            }
        });

    }, [initialItems, elements]);

    // Responsive Column Handling
    // REMOVED: Custom resize handler caused conflicts with GridStack's internal engine.
    // relying on 'disableOneColumnMode: false' (default) for mobile.
    
    // Dynamic Edit Mode update
    useEffect(() => {
        if (!gridInstance.current) return;
        if (isEditMode) {
            gridInstance.current.enable();
        } else {
            gridInstance.current.disable();
        }
    }, [isEditMode]);

    // Expose methods
    useImperativeHandle(ref, () => ({
      getGrid: () => gridInstance.current!,
      addWidget: (item: GridItem) => {
        setElements(prev => {
             if (prev.find(e => e.id === item.id)) return prev;
             return [...prev, item];
        });
        // Note: The generic useEffect below will pick this up and makeWidget()
      },
      removeWidget: (id: string) => {
         const grid = gridInstance.current;
         if (!grid) return;
         // Use getGridItems() carefully, filter by gs-id attribute if node property is missing
         // But node property is best.
         const el = grid.getGridItems().find(n => n.gridstackNode?.id === id);
         
         if (el) {
             try {
                grid.removeWidget(el, false); // false = keep DOM, let React remove it
             } catch (e) { console.warn("Remove Widget Error", e); }
             setElements(prev => prev.filter(e => e.id !== id));
         } else {
             // Fallback: just update state if gridstack doesn't know about it yet
             setElements(prev => prev.filter(e => e.id !== id));
         }
      },
      save: () => {
          return gridInstance.current?.save(false) as GridItem[] || [];
      }
    }));

    // Sync React Elements with Gridstack
    // When `elements` state changes (e.g. new widget added), we need to ensure Gridstack knows.
    // However, for initial render, the nodes are there.
    // For added widgets, utilize makeWidget.
    useEffect(() => {
        const grid = gridInstance.current;
        if (!grid) return;

        // Give React a moment to render the DOM nodes
        setTimeout(() => {
            // makeWidget will turn new .grid-stack-item elements into widgets
            // It ignores already initialized ones.
            grid.makeWidget('.grid-stack-item'); 
        }, 0);
    }, [elements]);

    return (
      <div 
        ref={gridRef} 
        className={cn("grid-stack", className)} 
      >
         {elements.map(item => (
             <div 
                key={item.id} 
                className="grid-stack-item" 
                gs-id={item.id}
                gs-x={item.x}
                gs-y={item.y}
                gs-w={item.w}
                gs-h={item.h}
                data-gs-type={item.type} // Store type in DOM attribute for easy access
                // Important: Gridstack uses attributes for initial load
             >
                <div className="grid-stack-item-content">
                   {renderItem(item)}
                </div>
             </div>
         ))}
      </div>
    );
  }
);

GridStackWrapper.displayName = "GridStackWrapper";
