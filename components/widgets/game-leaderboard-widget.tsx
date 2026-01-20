"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Medal, Crown, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardEntry = {
  userId: string;
  userName: string;
  bestScore: number;
  createdAt: string;
};

type GameLeaderboardWidgetProps = {
  widgetId: string;
  config?: {
    gameId?: string;
    limit?: number;
    showUserRank?: boolean;
  };
  onConfigChange?: (newConfig: any) => void;
  isEditMode?: boolean;
};

const GAMES = [
  { id: "snake", name: "Snake", icon: "🐍" },
  { id: "2048", name: "2048", icon: "🔢" },
];

export default function GameLeaderboardWidget({
  widgetId,
  config = {},
  onConfigChange,
  isEditMode = false,
}: GameLeaderboardWidgetProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState(
    config.gameId || GAMES[0].id
  );

  const limit = config.limit || 10;

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGame]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/games/scores?gameId=${selectedGame}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Impossible de charger le classement");
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-xs text-muted-foreground">#{rank}</span>;
    }
  };

  const currentGame = GAMES.find((g) => g.id === selectedGame);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Chargement du classement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Classement {currentGame?.icon} {currentGame?.name}
        </h3>
      </div>

      {/* Sélecteur de jeu */}
      <div className="flex gap-2 mb-4">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
              selectedGame === game.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span>{game.icon}</span>
            <span>{game.name}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <Gamepad2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucun score enregistré pour ce jeu
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                index < 3
                  ? "bg-gradient-to-r from-primary/10 to-transparent border border-primary/20"
                  : "bg-muted/50"
              )}
            >
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {getMedalIcon(index + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.userName || "Anonyme"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-lg font-bold text-primary">
                  {entry.bestScore.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
