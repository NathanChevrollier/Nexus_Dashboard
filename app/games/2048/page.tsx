"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Cell = number;
type Board = Cell[][];

const GRID_SIZE = 4;

const useResponsiveTileSize = () => {
  const [tileSize, setTileSize] = useState(100);
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setTileSize(140);
      else if (width >= 1280) setTileSize(120);
      else if (width >= 1024) setTileSize(110);
      else if (width >= 768) setTileSize(100);
      else setTileSize(80);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return tileSize;
};

const initializeBoard = (): Board => {
  const board: Board = Array(GRID_SIZE)
    .fill(0)
    .map(() => Array(GRID_SIZE).fill(0));
  addRandomTile(board);
  addRandomTile(board);
  return board;
};

const addRandomTile = (board: Board): void => {
  const emptyCells: [number, number][] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) {
        emptyCells.push([i, j]);
      }
    }
  }
  if (emptyCells.length > 0) {
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[row][col] = Math.random() < 0.9 ? 2 : 4;
  }
};

const rotateBoard = (board: Board): Board => {
  const newBoard: Board = Array(GRID_SIZE)
    .fill(0)
    .map(() => Array(GRID_SIZE).fill(0));
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      newBoard[j][GRID_SIZE - 1 - i] = board[i][j];
    }
  }
  return newBoard;
};

const moveLeft = (board: Board): { board: Board; score: number; moved: boolean } => {
  let score = 0;
  let moved = false;
  const newBoard = board.map((row) => {
    const filtered = row.filter((cell) => cell !== 0);
    const merged: number[] = [];
    let skip = false;

    for (let i = 0; i < filtered.length; i++) {
      if (skip) {
        skip = false;
        continue;
      }
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const newValue = filtered[i] * 2;
        merged.push(newValue);
        score += newValue;
        skip = true;
        moved = true;
      } else {
        merged.push(filtered[i]);
      }
    }

    while (merged.length < GRID_SIZE) {
      merged.push(0);
    }

    if (!moved && JSON.stringify(row) !== JSON.stringify(merged)) {
      moved = true;
    }

    return merged;
  });

  return { board: newBoard, score, moved };
};

const move = (board: Board, direction: "left" | "right" | "up" | "down"): { board: Board; score: number; moved: boolean } => {
  let workBoard = board.map((row) => [...row]);
  let rotations = 0;

  switch (direction) {
    case "right":
      rotations = 2;
      break;
    case "up":
      rotations = 3;
      break;
    case "down":
      rotations = 1;
      break;
  }

  for (let i = 0; i < rotations; i++) {
    workBoard = rotateBoard(workBoard);
  }

  const result = moveLeft(workBoard);

  for (let i = 0; i < (4 - rotations) % 4; i++) {
    result.board = rotateBoard(result.board);
  }

  return result;
};

const canMove = (board: Board): boolean => {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) return true;
      if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return true;
      if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return true;
    }
  }
  return false;
};

const hasWon = (board: Board): boolean => {
  return board.some((row) => row.some((cell) => cell === 2048));
};

const getTileColor = (value: number): string => {
  const colors: Record<number, string> = {
    0: "bg-slate-700/50",
    2: "bg-slate-100 text-slate-900",
    4: "bg-slate-200 text-slate-900",
    8: "bg-orange-300 text-white",
    16: "bg-orange-400 text-white",
    32: "bg-orange-500 text-white",
    64: "bg-orange-600 text-white",
    128: "bg-yellow-400 text-white",
    256: "bg-yellow-500 text-white",
    512: "bg-yellow-600 text-white",
    1024: "bg-yellow-700 text-white",
    2048: "bg-yellow-800 text-white",
  };
  return colors[value] || "bg-purple-600 text-white";
};

type LeaderboardEntry = {
  userId: string;
  userName: string;
  bestScore: number;
  createdAt: string;
};

export default function Game2048() {
  const router = useRouter();
  const { data: session } = useSession();
  const tileSize = useResponsiveTileSize();
  
  // Charger l'état du jeu depuis localStorage
  const [board, setBoard] = useState<Board>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-game-board');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return initializeBoard();
        }
      }
    }
    return initializeBoard();
  });
  
  const [score, setScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-game-score');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  
  const [bestScore, setBestScore] = useState(0);
  
  const [gameOver, setGameOver] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-game-over');
      return saved === 'true';
    }
    return false;
  });
  
  const [won, setWon] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-game-won');
      return saved === 'true';
    }
    return false;
  });
  
  const [scoreSaved, setScoreSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Charger le meilleur score depuis l'API
  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=2048&userOnly=true");
        if (res.ok) {
          const data = await res.json();
          if (data?.score) {
            setBestScore(data.score);
          }
        }
      } catch (error) {
        console.error("Error fetching best score:", error);
      }
    };
    fetchBestScore();
  }, []);

  // Charger le leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=2048&limit=10");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };
    fetchLeaderboard();
  }, []);

  // Sauvegarder le score quand le jeu se termine
  useEffect(() => {
    const saveScore = async () => {
      if ((gameOver || won) && score > 0 && !scoreSaved && session?.user) {
        setScoreSaved(true);
        try {
          const res = await fetch("/api/games/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: "2048",
              score,
              metadata: { won, maxTile: Math.max(...board.flat()) },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isNewBest) {
              setBestScore(score);
            }
            // Recharger le leaderboard
            const leaderRes = await fetch("/api/games/scores?gameId=2048&limit=10");
            if (leaderRes.ok) {
              const leaderData = await leaderRes.json();
              setLeaderboard(leaderData);
            }
          }
        } catch (error) {
          console.error("Error saving score:", error);
        }
      }
    };
    saveScore();
  }, [gameOver, won, score, scoreSaved, session, board]);

  // Sauvegarder l'état du jeu dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('2048-game-board', JSON.stringify(board));
      localStorage.setItem('2048-game-score', score.toString());
      localStorage.setItem('2048-game-over', gameOver.toString());
      localStorage.setItem('2048-game-won', won.toString());
    }
  }, [board, score, gameOver, won]);

  useEffect(() => {
    const saved = localStorage.getItem("2048-best-score");
    if (saved) setBestScore(parseInt(saved));
  }, []);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("2048-best-score", score.toString());
    }
  }, [score, bestScore]);

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameOver || won) return;

      const result = move(board, direction);
      if (result.moved) {
        const newBoard = result.board;
        addRandomTile(newBoard);
        setBoard(newBoard);
        setScore((s) => s + result.score);

        if (hasWon(newBoard) && !won) {
          setWon(true);
        } else if (!canMove(newBoard)) {
          setGameOver(true);
        }
      }
    },
    [board, gameOver, won]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case "ArrowLeft":
            handleMove("left");
            break;
          case "ArrowRight":
            handleMove("right");
            break;
          case "ArrowUp":
            handleMove("up");
            break;
          case "ArrowDown":
            handleMove("down");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  const resetGame = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setScoreSaved(false);
    
    // Effacer la sauvegarde
    if (typeof window !== 'undefined') {
      localStorage.setItem('2048-game-board', JSON.stringify(newBoard));
      localStorage.setItem('2048-game-score', '0');
      localStorage.setItem('2048-game-over', 'false');
      localStorage.setItem('2048-game-won', 'false');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-amber-950 to-orange-900 p-4 gap-6">
      <div className="bg-card rounded-xl shadow-2xl p-6 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🎯 2048
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Combinez les tuiles pour atteindre 2048 !
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-muted/30 rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="text-xl font-bold">{score}</div>
            </div>
            <div className="bg-muted/30 rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-muted-foreground">Meilleur</div>
              <div className="text-xl font-bold">{bestScore}</div>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div 
          className="relative bg-slate-800 rounded-xl p-3 shadow-inner mx-auto"
          style={{ width: tileSize * 4 + 48, height: tileSize * 4 + 48 }}
        >
          <div className="grid grid-cols-4 gap-3 h-full">
            {board.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={cn(
                    "rounded-lg flex items-center justify-center font-bold transition-all duration-150 shadow-md",
                    getTileColor(cell),
                    cell === 0 && "text-transparent"
                  )}
                  style={{ 
                    width: tileSize, 
                    height: tileSize,
                    fontSize: `${Math.max(20, tileSize / 4)}px`
                  }}
                >
                  {cell !== 0 && cell}
                </div>
              ))
            )}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
              <div className="text-4xl font-bold text-red-500 animate-bounce">
                Game Over!
              </div>
              <div className="text-2xl text-white">Score final: {score}</div>
              <Button onClick={resetGame} size="lg">
                <RotateCcw className="mr-2 h-5 w-5" />
                Recommencer
              </Button>
            </div>
          )}

          {/* Win Overlay */}
          {won && !gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
              <Trophy className="h-16 w-16 text-yellow-400 animate-bounce" />
              <div className="text-4xl font-bold text-yellow-400">
                Victoire !
              </div>
              <div className="text-xl text-white">Vous avez atteint 2048 !</div>
              <div className="flex gap-3">
                <Button onClick={() => setWon(false)} variant="outline" size="lg">
                  Continuer
                </Button>
                <Button onClick={resetGame} size="lg">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Nouvelle partie
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            onClick={() => router.push("/dashboard")}
            size="lg"
            variant="outline"
          >
            <Home className="mr-2 h-5 w-5" />
            Dashboard
          </Button>
          <Button onClick={resetGame} size="lg" variant="outline">
            <RotateCcw className="mr-2 h-5 w-5" />
            Nouvelle partie
          </Button>
        </div>

        {/* Mobile Controls */}
        <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs mx-auto md:hidden">
          <div />
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleMove("up")}
            className="aspect-square text-2xl"
          >
            ⬆️
          </Button>
          <div />
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleMove("left")}
            className="aspect-square text-2xl"
          >
            ⬅️
          </Button>
          <div />
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleMove("right")}
            className="aspect-square text-2xl"
          >
            ➡️
          </Button>
          <div />
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleMove("down")}
            className="aspect-square text-2xl"
          >
            ⬇️
          </Button>
          <div />
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">Comment jouer :</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Utilisez les flèches ⬆️⬇️⬅️➡️ pour déplacer les tuiles</li>
            <li>• Les tuiles avec le même nombre fusionnent</li>
            <li>• Atteignez la tuile 2048 pour gagner !</li>
            <li>• Le jeu se termine quand aucun mouvement n&apos;est possible</li>
          </ul>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full lg:w-80">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Classement
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun score enregistré
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  index < 3
                    ? "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                    : "bg-muted/50",
                  session?.user?.id === entry.userId && "ring-2 ring-primary"
                )}
              >
                <div className="flex-shrink-0 w-8 flex items-center justify-center font-bold text-lg">
                  {index === 0 && "🥇"}
                  {index === 1 && "🥈"}
                  {index === 2 && "🥉"}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.userName || "Anonyme"}
                    {session?.user?.id === entry.userId && (
                      <span className="text-xs text-primary ml-2">(Vous)</span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <p className="text-lg font-bold text-amber-500">
                    {entry.bestScore.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
