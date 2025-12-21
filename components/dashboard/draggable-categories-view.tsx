"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Dashboard, Widget, Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Edit, Save, Plus, Settings } from "lucide-react";
import { CategorySection, AddCategoryButton } from "@/components/dashboard/category-section";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { reorderCategories, moveWidgetToCategory } from "@/lib/actions/drag-drop";

interface DraggableCategoriesViewProps {
  dashboard: Dashboard;
  isOwner: boolean;
  isEditMode: boolean;
  widgets: Widget[];
  categories: Category[];
  onWidgetDelete: (widgetId: string) => void;
  onWidgetEdit: (widget: Widget) => void;
  onCategoryAdded: () => void;
}

export function DraggableCategoriesView({
  dashboard,
  isOwner,
  isEditMode,
  widgets,
  categories: initialCategories,
  onWidgetDelete,
  onWidgetEdit,
  onCategoryAdded,
}: DraggableCategoriesViewProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setIsSaving(true);
    try {
      // Drag category to reorder
      if (type === "category") {
        const newCategories = Array.from(categories);
        const [removed] = newCategories.splice(source.index, 1);
        newCategories.splice(destination.index, 0, removed);
        
        setCategories(newCategories);
        await reorderCategories(newCategories.map(cat => cat.id));
      }
      
      // Drag widget to category
      if (type === "widget") {
        const widgetId = result.draggableId;
        const newCategoryId = destination.droppableId === "uncategorized" ? null : destination.droppableId;
        
        await moveWidgetToCategory(widgetId, newCategoryId);
        window.location.reload(); // Reload to show changes
      }
    } catch (error) {
      console.error("Erreur lors du drag & drop:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getWidgetsByCategory = (categoryId: string | null) => {
    return widgets.filter(w => w.categoryId === categoryId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Categories - Droppable for reordering */}
      <Droppable droppableId="all-categories" type="category" isDropDisabled={!isEditMode}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
            {categories.map((category, index) => (
              <Draggable
                key={category.id}
                draggableId={category.id}
                index={index}
                isDragDisabled={!isEditMode}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={snapshot.isDragging ? "opacity-50" : ""}
                  >
                    {/* Droppable zone inside category for widgets */}
                    <Droppable 
                      droppableId={category.id} 
                      type="widget"
                      isDropDisabled={!isEditMode}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={snapshot.isDraggingOver ? "ring-2 ring-primary rounded-lg" : ""}
                        >
                          <CategorySection
                            category={category}
                            widgets={getWidgetsByCategory(category.id)}
                            isEditMode={isEditMode}
                            onWidgetDelete={onWidgetDelete}
                            onWidgetEdit={onWidgetEdit}
                            dragHandleProps={provided.dragHandleProps}
                          />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add Category Button */}
      {isEditMode && isOwner && (
        <div className="mt-4">
          <AddCategoryButton dashboardId={dashboard.id} onCategoryAdded={onCategoryAdded} />
        </div>
      )}

      {/* Uncategorized Widgets - Droppable zone */}
      {getWidgetsByCategory(null).length > 0 && (
        <Droppable droppableId="uncategorized" type="widget" isDropDisabled={!isEditMode}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`mt-8 ${snapshot.isDraggingOver ? "ring-2 ring-primary rounded-lg p-2" : ""}`}
            >
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Widgets sans catégorie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getWidgetsByCategory(null).map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`relative ${snapshot.isDragging ? "opacity-50" : ""}`}
                      >
                        <div className="bg-card border rounded-lg shadow-sm h-full">
                          <WidgetComponent widget={widget} isEditMode={isEditMode} />
                        </div>
                        {isEditMode && (
                          <div className="absolute top-2 right-2 flex gap-1 z-10">
                            <Button
                              onClick={() => onWidgetEdit(widget)}
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              title="Modifier le widget"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => onWidgetDelete(widget.id)}
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6"
                              title="Supprimer le widget"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      )}

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Enregistrement...
        </div>
      )}
    </DragDropContext>
  );
}
