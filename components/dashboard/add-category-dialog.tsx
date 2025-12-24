"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory } from "@/lib/actions/categories";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onCategoryAdded: () => void;
}

const EMOJI_OPTIONS = ["📁", "⭐", "🎯", "💼", "📊", "🎨", "🔧", "📱", "💡", "🚀", "📈", "🎮"];
const COLOR_OPTIONS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

export function AddCategoryDialog({
  open,
  onOpenChange,
  dashboardId,
  onCategoryAdded,
}: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createCategory({
        dashboardId,
        name: name.trim(),
        icon,
        color,
        x: 0,
        y: 0,
        w: 6,
        h: 4,
      });
      
      setName("");
      setIcon("📁");
      setColor("#3b82f6");
      onOpenChange(false);
      onCategoryAdded();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la création de la catégorie");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer une catégorie</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma catégorie"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`p-3 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                    icon === emoji
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    color === c
                      ? "border-foreground scale-105 ring-2 ring-offset-2 ring-primary"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
