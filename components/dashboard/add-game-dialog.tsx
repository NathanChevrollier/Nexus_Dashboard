"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Smile } from "lucide-react";
import { nanoid } from "nanoid";

type Game = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  gameUrl?: string;
  gameType?: string;
  config?: Record<string, any>;
  isActive?: boolean;
  order?: number;
};

type AddGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (game: Game) => void;
  editGame?: Game | null;
};

const EMOJI_GAMES = [
  "🎮", "🕹️", "👾", "🎯", "🎲", "🃏", "🎰", "♟️", 
  "🧩", "🎪", "🎭", "🎨", "🎵", "🎸", "🎹", "🎤",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏓", "🥊",
  "♠️", "♥️", "♦️", "♣️", "🎴", "🀄", "🎬", "🎥"
];

export default function AddGameDialog({
  open,
  onOpenChange,
  onSuccess,
  editGame,
}: AddGameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "🎮",
    gameUrl: "",
    gameType: "internal",
    order: 0,
  });

  useEffect(() => {
    if (editGame) {
      setFormData({
        title: editGame.title || "",
        description: editGame.description || "",
        icon: editGame.icon || "🎮",
        gameUrl: editGame.gameUrl || "",
        gameType: editGame.gameType || "internal",
        order: editGame.order || 0,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        icon: "🎮",
        gameUrl: "",
        gameType: "internal",
        order: 0,
      });
    }
  }, [editGame, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Le titre est requis");
      return;
    }

    setLoading(true);
    try {
      const url = editGame
        ? `/api/widgets/games/${editGame.id}`
        : "/api/widgets/games";
      const method = editGame ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save game");

      const savedGame = await res.json();
      onSuccess?.(savedGame);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving game:", error);
      alert("Impossible d'enregistrer le jeu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editGame ? "Modifier le jeu" : "Ajouter un jeu"}
          </DialogTitle>
          <DialogDescription>
            {editGame
              ? "Modifiez les informations de votre jeu"
              : "Ajoutez un nouveau jeu à votre collection"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Titre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ex: Snake, Tetris, Memory..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description courte du jeu..."
              rows={2}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label htmlFor="icon">Icône</Label>
            <div className="flex gap-2">
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, icon: e.target.value }))
                }
                placeholder="🎮 ou URL d'image"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            {showEmojiPicker && (
              <div className="grid grid-cols-8 gap-2 p-3 bg-muted/30 rounded-lg border">
                {EMOJI_GAMES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-2xl hover:scale-125 transition-transform p-1 hover:bg-accent rounded"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, icon: emoji }));
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Game Type */}
          <div className="space-y-2">
            <Label htmlFor="gameType">Type de jeu</Label>
            <Select
              value={formData.gameType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gameType: value }))
              }
            >
              <SelectTrigger id="gameType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Interne (sur ce site)</SelectItem>
                <SelectItem value="external">Externe (nouvel onglet)</SelectItem>
                <SelectItem value="iframe">iFrame (intégré)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Game URL */}
          <div className="space-y-2">
            <Label htmlFor="gameUrl">
              URL du jeu {formData.gameType === "internal" && "(optionnel)"}
            </Label>
            <Input
              id="gameUrl"
              type="url"
              value={formData.gameUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gameUrl: e.target.value }))
              }
              placeholder={
                formData.gameType === "internal"
                  ? "/games/snake"
                  : "https://example.com/game"
              }
            />
            <p className="text-xs text-muted-foreground">
              {formData.gameType === "internal" &&
                "Laissez vide si le jeu n'est pas encore développé"}
              {formData.gameType === "external" &&
                "URL vers le jeu externe (ouvrira dans un nouvel onglet)"}
              {formData.gameType === "iframe" &&
                "URL du jeu à intégrer dans une iframe"}
            </p>
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="order">Ordre d'affichage</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editGame ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
