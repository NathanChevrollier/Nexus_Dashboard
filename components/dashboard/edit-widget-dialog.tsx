"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWidget } from "@/lib/actions/widgets";
import { Widget, Category } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";

interface EditWidgetDialogProps {
  widget: Widget | null;
  categories: Category[];
  widgets: Widget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWidgetUpdated?: (widgetId: string, newCategoryId: string | null, oldCategoryId: string | null) => void;
}

export function EditWidgetDialog({ widget, categories, widgets, open, onOpenChange, onWidgetUpdated }: EditWidgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const [options, setOptions] = useState<any>({});

  useEffect(() => {
    if (widget) {
      setTitle(widget.options?.title || "");
      setCategoryId(widget.categoryId || null);
      setInitialCategoryId(widget.categoryId || null);
      setOptions(widget.options || {});
    }
  }, [widget]);

  const getWidgetCount = (catId: string) => {
    return widgets.filter((w) => w.categoryId === catId).length;
  };


  const handleSubmit = async () => {
    if (!widget) return;

    setLoading(true);
    try {
      await updateWidget(widget.id, {
        options: { ...options, title },
        categoryId: categoryId,
      });
      onWidgetUpdated?.(widget.id, categoryId, initialCategoryId);
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour du widget");
    } finally {
      setLoading(false);
    }
  };

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le Widget</DialogTitle>
          <DialogDescription>
            Type: <span className="font-semibold">{widget.type}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du widget"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              📦 Catégorie
            </Label>
            <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Aucune catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <span>🏠</span>
                    <span>Grille principale (sans catégorie)</span>
                  </span>
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon || '📁'}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryId && categoryId !== initialCategoryId && (
              <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <span>✨</span>
                  <span className="font-medium">Le widget sera déplacé dans cette catégorie</span>
                </p>
              </div>
            )}
            {!categoryId && initialCategoryId && (
              <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <span>🔄</span>
                  <span className="font-medium">Le widget sera déplacé vers la grille principale</span>
                </p>
              </div>
            )}
          </div>

          {/* Widget-specific options */}
          {widget.type === "link" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={options.url || ""}
                  onChange={(e) => setOptions({ ...options, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icône (emoji)</Label>
                <Input
                  id="icon"
                  value={options.icon || ""}
                  onChange={(e) => setOptions({ ...options, icon: e.target.value })}
                  placeholder="🔗"
                  maxLength={2}
                />
              </div>
            </>
          )}

          {widget.type === "ping" && (
            <div className="space-y-2">
              <Label htmlFor="targetUrl">URL à surveiller</Label>
              <Input
                id="targetUrl"
                value={options.targetUrl || ""}
                onChange={(e) => setOptions({ ...options, targetUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}

          {widget.type === "iframe" && (
            <div className="space-y-2">
              <Label htmlFor="iframeUrl">URL de l'iframe</Label>
              <Input
                id="iframeUrl"
                value={options.url || ""}
                onChange={(e) => setOptions({ ...options, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}

          {widget.type === "weather" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={options.city || ""}
                  onChange={(e) => setOptions({ ...options, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="units">Unités</Label>
                <Select value={options.units || "metric"} onValueChange={(v) => setOptions({ ...options, units: v })}>
                  <SelectTrigger id="units">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Métrique (°C)</SelectItem>
                    <SelectItem value="imperial">Impérial (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
