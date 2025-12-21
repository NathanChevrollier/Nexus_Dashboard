"use client";

import { useState } from "react";
import GridLayout from "@/components/ui/grid-layout";
import type { Layout } from "react-grid-layout";
import { Dashboard, Widget, Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Edit, Save, Plus, Trash2, Settings } from "lucide-react";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { AddWidgetDialogModern } from "@/components/dashboard/add-widget-dialog-modern";
import { EditWidgetDialog } from "@/components/dashboard/edit-widget-dialog";
import { CategorySection, AddCategoryButton } from "@/components/dashboard/category-section";
import { updateWidgetPositions, deleteWidget } from "@/lib/actions/widgets";

interface DashboardViewProps {
  dashboard: Dashboard;
  isOwner: boolean;
  initialWidgets?: Widget[];
  initialCategories?: Category[];
}

export function DashboardView({ dashboard, isOwner, initialWidgets = [], initialCategories = [] }: DashboardViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [dashboardCategories, setDashboardCategories] = useState<Category[]>(initialCategories);
  const [saving, setSaving] = useState(false);

  const layout = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
  }));

  const handleLayoutChange = (newLayout: Layout) => {
    const updatedWidgets = widgets.map((widget) => {
      const layoutItem = newLayout.find((l) => l.i === widget.id);
      if (layoutItem) {
        return { ...widget, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const updates = widgets.map((w) => ({
        id: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      }));
      await updateWidgetPositions(updates);
      setIsEditMode(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
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
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression du widget");
      }
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowEditDialog(true);
  };

  const handleWidgetUpdated = () => {
    // Recharger les widgets
    window.location.reload();
  };

  const handleCategoryAdded = () => {
    // Recharger la page pour afficher la nouvelle catégorie
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {isOwner && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{dashboard.name}</h2>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button onClick={() => setShowAddDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter Widget
                </Button>
                <Button onClick={saveLayout} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button onClick={() => setIsEditMode(false)} variant="outline">
                  Annuler
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditMode(true)} variant="outline">
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bouton ajouter catégorie */}
      {isEditMode && isOwner && dashboardCategories.length > 0 && (
        <div className="mb-4">
          <AddCategoryButton dashboardId={dashboard.id} onCategoryAdded={handleCategoryAdded} />
        </div>
      )}

      {/* Widgets par catégorie */}
      {dashboardCategories.length > 0 && (
        <div className="mb-8 space-y-4">
          {dashboardCategories.map((category) => {
            const categoryWidgets = widgets.filter((w) => w.categoryId === category.id);
            return (
              <CategorySection
                key={category.id}
                category={category}
                widgets={categoryWidgets}
                isEditMode={isEditMode}
                onWidgetDelete={handleDeleteWidget}
                onWidgetEdit={handleEditWidget}
              />
            );
          })}
        </div>
      )}

      {/* Widgets sans catégorie */}
      {widgets.filter((w) => !w.categoryId).length > 0 ? (
        <div>
          {dashboardCategories.length > 0 && (
            <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Widgets sans catégorie</h3>
          )}

          {isEditMode ? (
            <div style={{ width: "100%" }}>
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={80}
                width={1200}
                isDraggable={true}
                isResizable={true}
                compactType={null}
                preventCollision={false}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".widget-drag-handle"
                draggableCancel=".widget-no-drag, input, textarea, button, select, a, [role='button']"
                {...({} as any)}
              >
                {widgets.filter((w) => !w.categoryId).map((widget) => (
                  <div
                    key={widget.id}
                    className="bg-card border rounded-lg shadow-sm relative"
                  >
                    <WidgetComponent
                      widget={widget}
                      isEditMode={true}
                      onEdit={() => handleEditWidget(widget)}
                      onDelete={() => handleDeleteWidget(widget.id)}
                    />
                  </div>
                ))}
              </GridLayout>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {widgets
                .filter((w) => !w.categoryId)
                .sort((a, b) => a.y - b.y || a.x - b.x)
                .map((widget) => (
                  <div
                    key={widget.id}
                    className="bg-card border rounded-lg shadow-sm relative"
                  >
                    <WidgetComponent widget={widget} isEditMode={false} />
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Aucun widget pour le moment</p>
            {isOwner && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter votre premier widget
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <AddWidgetDialogModern
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        dashboardId={dashboard.id}
        onWidgetAdded={(newWidget: Widget) => setWidgets([...widgets, newWidget])}
      />

      <EditWidgetDialog
        widget={editingWidget}
        categories={dashboardCategories}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onWidgetUpdated={handleWidgetUpdated}
      />
    </div>
  );
}
