"use client";

import { useState, useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, GripVertical, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Category, Widget } from "@/lib/db/schema";
import { WidgetComponent } from "@/components/widgets/widget-component";
import { createCategory, updateCategory, deleteCategory, toggleCategoryCollapse } from "@/lib/actions/categories";
import { useAlert } from "@/components/ui/confirm-provider";
import EmojiPicker from "@/components/ui/emoji-picker";

interface CategorySectionProps {
  category: Category;
  widgets: Widget[];
  isEditMode: boolean;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetEdit?: (widget: Widget) => void;
  dragHandleProps?: any;
}

export function CategorySection({ 
  category, 
  widgets, 
  isEditMode, 
  onWidgetDelete, 
  onWidgetEdit, 
  dragHandleProps 
}: CategorySectionProps) {
  const alert = useAlert();
  const confirm = useConfirm();
  
  const [isCollapsed, setIsCollapsed] = useState(category.isCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [editName, setEditName] = useState(category.name);
  const [editIcon, setEditIcon] = useState(category.icon || "📁");
  const [editColor, setEditColor] = useState(category.color || "#3b82f6");

  // Sync form fields when the category prop changes (but avoid clobbering while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditName(category.name);
      setEditIcon(category.icon || "📁");
      setEditColor(category.color || "#3b82f6");
    }
  }, [category.id, category.name, category.icon, category.color, isEditing]);

  // Si on est en mode édition, on FORCE l'ouverture
  const effectiveCollapsed = isEditMode ? false : isCollapsed;

  const toggleCollapse = async () => {
    // Empêcher le toggle manuel en mode édition pour ne pas contredire la logique forcée
    if (isEditMode) return;

    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Optimistic UI update, then server sync
    try {
      await toggleCategoryCollapse(category.id, newState);
    } catch (e) {
      setIsCollapsed(!newState); // Rollback on error
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateCategory(category.id, {
        name: editName,
        icon: editIcon,
        color: editColor,
      });
      setIsEditing(false);
    } catch (e) {
      await alert("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(`Supprimer la catégorie "${category.name}" et libérer ses widgets ?`)) {
      try {
        await deleteCategory(category.id);
      } catch (e) {
        await alert("Erreur lors de la suppression");
      }
    }
  };

  return (
    <>
      <div className="mb-6 group">
        {/* HEADER DE SECTION (entier cliquable pour toggle) */}
        <div
          className="flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-accent/50 cursor-pointer"
          onClick={() => toggleCollapse()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(); } }}
          role="button"
          tabIndex={0}
        >
          
          {/* Poignée de drag (si props fournies par le parent draggable) */}
          {isEditMode && dragHandleProps && (
            <div
              className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-background text-muted-foreground z-20"
              {...dragHandleProps}
              onPointerDown={(e) => {
                // Empêcher le toggle de la section lors d'un clic sur la poignée
                e.stopPropagation();
                // Appeler le handler d'origine si présent (compatibilité avec hello-pangea/dnd)
                try {
                  const fn = (dragHandleProps as any)?.onPointerDown || (dragHandleProps as any)?.onMouseDown;
                  if (typeof fn === 'function') fn(e);
                } catch (err) {
                  // ignore
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                try {
                  const fn = (dragHandleProps as any)?.onMouseDown || (dragHandleProps as any)?.onPointerDown;
                  if (typeof fn === 'function') fn(e);
                } catch (err) {}
              }}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Toggle icon & Titre (non-clickable séparément, le conteneur gère le click) */}
          <div className="flex items-center gap-2 flex-1 text-left">
            <div className="p-1 rounded-md hover:bg-background transition-colors text-muted-foreground">
              {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl filter drop-shadow-sm">{category.icon}</span>
              <h3 className="text-lg font-semibold tracking-tight text-foreground/90">{category.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {widgets.length}
              </span>
            </div>
          </div>

          {/* Actions d'édition */}
          {isEditMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  // Initialize edit fields from latest category values when opening
                  setEditName(category.name);
                  setEditIcon(category.icon || "📁");
                  setEditColor(category.color || "#3b82f6");
                  setIsEditing(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={async (e) => { e.stopPropagation(); await handleDelete(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* CONTENU (GRILLE DE WIDGETS) */}
        {!effectiveCollapsed && (
          <Droppable droppableId={category.id} type="widget" isDropDisabled={!isEditMode}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`mt-4 pl-4 border-l-2 border-border/40 ml-4 animate-in slide-in-from-top-2 fade-in duration-200 transition-colors ${
                  snapshot.isDraggingOver ? "bg-muted/10 rounded-lg ring-2 ring-primary/20" : ""
                }`}
              >
                {widgets.length === 0 && !snapshot.isDraggingOver ? (
                  <div className="py-8 text-center text-muted-foreground/50 border-2 border-dashed border-muted rounded-xl bg-muted/5">
                    <Folder className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Aucun widget ici</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {widgets.map((widget, index) => (
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
                            className={`h-full ${snapshot.isDragging ? "opacity-50" : ""}`}
                            style={provided.draggableProps.style}
                          >
                            <WidgetComponent
                              widget={widget}
                              isEditMode={isEditMode}
                              onEdit={onWidgetEdit ? () => onWidgetEdit(widget) : undefined}
                              onDelete={() => onWidgetDelete(widget.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
                {/* Ensure placeholder is present even if we showed the empty state but are dragging over */}
                {(widgets.length === 0 && snapshot.isDraggingOver) && (
                   <div className="hidden">{provided.placeholder}</div>
                )}
              </div>
            )}
          </Droppable>
        )}
      </div>

      {/* DIALOGUE D'ÉDITION */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Catégorie</DialogTitle>
            <DialogDescription>Personnalisez l'apparence de votre section.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Ex: Divertissement"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Icône</Label>
              <div className="flex gap-2">
                <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted rounded-md border">
                  {editIcon}
                </div>
                <div className="flex-1">
                  <EmojiPicker value={editIcon} onSelect={setEditIcon} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Couleur (Optionnel)</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={editColor} 
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer" 
                />
                <Input 
                  value={editColor} 
                  onChange={(e) => setEditColor(e.target.value)} 
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Composant Bouton d'ajout simple
export function AddCategoryButton({ dashboardId, onCategoryAdded }: { dashboardId: string, onCategoryAdded: (c: Category) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const newCategory = await createCategory({ dashboardId, name: name.trim(), icon: "📁", color: "#3b82f6" });
      onCategoryAdded(newCategory);
      setIsOpen(false);
      setName("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Nouvelle Catégorie
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer une catégorie</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la catégorie" autoFocus />
            </div>
            <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full">
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}