"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Category, Widget } from "@/lib/db/schema";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { createCategory, updateCategory, deleteCategory, toggleCategoryCollapse } from "@/lib/actions/categories";
import { useAlert } from "@/components/ui/confirm-provider";

interface CategorySectionProps {
  category: Category;
  widgets: Widget[];
  isEditMode: boolean;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetEdit?: (widget: Widget) => void;
  dragHandleProps?: any;
}

export function CategorySection({ category, widgets, isEditMode, onWidgetDelete, onWidgetEdit, dragHandleProps }: CategorySectionProps) {
  const alert = useAlert();
  const [isCollapsed, setIsCollapsed] = useState(category.isCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editIcon, setEditIcon] = useState(category.icon || "📁");
  const [editColor, setEditColor] = useState(category.color || "#3b82f6");
  const confirm = useConfirm();

  const toggleCollapse = async () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    await toggleCategoryCollapse(category.id, newState);
  };

  const handleUpdate = async () => {
    await updateCategory(category.id, {
      name: editName,
      icon: editIcon,
      color: editColor,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (await confirm(`Supprimer la catégorie "${category.name}" et tous ses widgets ?`)) {
      await deleteCategory(category.id);
    }
  };

  return (
    <>
      <div className="mb-6">
        <div 
          className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-pointer hover:border-primary/30"
        >
          {isEditMode && (
            <Button variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...dragHandleProps}>
              <GripVertical className="h-4 w-4" />
            </Button>
          )}

          <button onClick={toggleCollapse} className="flex items-center gap-2 flex-1">
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-2xl">{category.icon}</span>
            <h3 className="text-xl font-semibold">{category.name}</h3>
            <span className="text-sm text-muted-foreground ml-2">
              ({widgets.length} widget{widgets.length > 1 ? "s" : ""})
            </span>
          </button>

          {isEditMode && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {widgets.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Aucun widget dans cette catégorie
              </div>
            ) : (
              widgets.map((widget) => (
                <div key={widget.id} className="relative">
                  <div className="bg-card border rounded-lg shadow-sm h-full">
                    <WidgetComponent
                      widget={widget}
                      isEditMode={isEditMode}
                      onEdit={onWidgetEdit ? () => onWidgetEdit(widget) : undefined}
                      onDelete={() => onWidgetDelete(widget.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Catégorie</DialogTitle>
            <DialogDescription>
              Personnalisez le nom, l'icône et la couleur de votre catégorie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ma catégorie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icône (emoji)</Label>
              <Input
                id="icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                placeholder="📁"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AddCategoryButtonProps {
  dashboardId: string;
  onCategoryAdded: (category: Category) => void;
}

export function AddCategoryButton({ dashboardId, onCategoryAdded }: AddCategoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newCategory = await createCategory({
        dashboardId,
        name: name.trim(),
        icon,
        color,
      });
      onCategoryAdded(newCategory);
      setName("");
      setIcon("📁");
      setColor("#3b82f6");
      setIsOpen(false);
    } catch (error) {
      console.error("Erreur:", error);
      await alert("Erreur lors de la création de la catégorie");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une Catégorie
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Catégorie</DialogTitle>
            <DialogDescription>
              Organisez vos widgets en catégories personnalisées
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nom</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Outils de Développement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-icon">Icône (emoji)</Label>
              <Input
                id="new-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📁"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-color">Couleur</Label>
              <div className="flex gap-2">
                <Input
                  id="new-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={loading || !name.trim()}>
              {loading ? "Création..." : "Créer la Catégorie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
