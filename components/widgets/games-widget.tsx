"use client";

import React from "react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Game = {
  id: string;
  title: string;
  icon: string;
  gameUrl: string;
  iconType?: 'emoji' | 'image'; // emoji or image path
};

type GamesWidgetProps = {
  widgetId: string;
  config?: {
    columns?: number;
    showTitles?: boolean;
    iconSize?: "sm" | "md" | "lg";
  };
  onConfigChange?: (newConfig: any) => void;
  isEditMode?: boolean;
};

// Jeux statiques intégrés
const GAMES: Game[] = [
  {
    id: "snake",
    title: "Snake",
    icon: "🐍",
    gameUrl: "/games/snake",
  },
  {
    id: "2048",
    title: "2048",
    icon: "🔢",
    gameUrl: "/games/2048",
  },
  {
    id: "pacman",
    title: "Pac-Man",
    icon: "👻",
    gameUrl: "/games/pacman",
  },
  {
    id: "tetris",
    title: "Tetris",
    icon: "🟦",
    gameUrl: "/games/tetris",
  },
  {
    id: "money-maker",
    title: "Money Maker",
    icon: "💰",
    gameUrl: "/games/MoneyMaker",
  },
  {
    id: "neural-nexus",
    title: "Neural Nexus",
    icon: "🧠",
    gameUrl: "/games/neural-nexus",
  },
  {
    id: "pokechill",
    title: "PokeChill",
    icon: "/images/pokechill.jpg",
    iconType: "image",
    gameUrl: "https://play-pokechill.github.io",
  },
];

export default function GamesWidget({
  widgetId,
  config = {},
  onConfigChange,
  isEditMode = false,
}: GamesWidgetProps) {
  const columns = config.columns || 3;
  const showTitles = config.showTitles !== false;
  const iconSize = config.iconSize || "md";

  const handleGameClick = (game: Game) => {
    if (!isEditMode && game.gameUrl) {
      // Si c'est une URL externe, ouvrir dans un nouvel onglet
      if (game.gameUrl.startsWith("http://") || game.gameUrl.startsWith("https://")) {
        window.open(game.gameUrl, "_blank");
      } else {
        // Sinon, navigation interne
        window.location.href = game.gameUrl;
      }
    }
  };

  const sizeClasses = {
    sm: "w-16 h-16 text-4xl",
    md: "w-20 h-20 text-5xl",
    lg: "w-24 h-24 text-6xl",
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Gamepad2 className="h-4 w-4" />
          Mes Jeux
        </h3>
      </div>

      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-3",
          columns === 4 && "grid-cols-4",
          columns === 5 && "grid-cols-5"
        )}
      >
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl transition-all cursor-pointer group relative",
              "bg-gradient-to-br from-muted/30 to-muted/10 hover:from-primary/10 hover:to-primary/5",
              "border border-border/50 hover:border-primary/50 hover:shadow-lg",
              isEditMode && "ring-2 ring-orange-500/50"
            )}
            onClick={() => handleGameClick(game)}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex items-center justify-center rounded-lg bg-background/50 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform",
                sizeClasses[iconSize]
              )}
            >
              {game.iconType === "image" ? (
                <img
                  src={game.icon}
                  alt={game.title}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="select-none">{game.icon}</span>
              )}
            </div>

            {/* Title */}
            {showTitles && (
              <div className="text-center w-full">
                <p className="text-xs font-medium truncate">{game.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
