"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Home, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Board = (number | null)[][];

type LeaderboardEntry = {
  userId: string;
  userName: string;
  bestScore: number;
  createdAt: string;
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const useResponsiveCellSize = () => {
  const [cellSize, setCellSize] = useState(30);
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setCellSize(42);
      else if (width >= 1280) setCellSize(38);
      else if (width >= 1024) setCellSize(34);
      else if (width >= 768) setCellSize(30);
      else setCellSize(26);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return cellSize;
};

const PIECES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const PIECE_COLORS: Record<string, string> = {
  I: "#00F0F0",
  O: "#F0F000",
  T: "#A000F0",
  L: "#F0A000",
  J: "#0000F0",
  S: "#00F000",
  Z: "#F00000",
};

type PieceType = keyof typeof PIECES;

interface Piece {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
}

export default function TetrisGame() {
  const router = useRouter();
  const { data: session } = useSession();
  const CELL_SIZE = useResponsiveCellSize();

  const [board, setBoard] = useState<Board>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);

  const dropIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=tetris&userOnly=true");
        if (res.ok) {
          const data = await res.json();
          if (data?.score) setBestScore(data.score);
        }
      } catch (error) {
        console.error("Error fetching best score:", error);
      }
    };
    fetchBestScore();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=tetris&limit=10");
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

  useEffect(() => {
    const saveScore = async () => {
      if (gameOver && score > 0 && !scoreSaved && session?.user) {
        setScoreSaved(true);
        try {
          const res = await fetch("/api/games/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: "tetris",
              score,
              metadata: { level, linesCleared },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isNewBest) setBestScore(score);
            const leaderRes = await fetch("/api/games/scores?gameId=tetris&limit=10");
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
  }, [gameOver, score, scoreSaved, session, level, linesCleared]);

  const createPiece = useCallback((): Piece => {
    const types = Object.keys(PIECES) as PieceType[];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      type,
      shape: PIECES[type],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[type][0].length / 2),
      y: 0,
    };
  }, []);

  useEffect(() => {
    if (!currentPiece && !gameOver && !isPaused) {
      if (nextPiece) {
        setCurrentPiece(nextPiece);
        setNextPiece(createPiece());
      } else {
        setCurrentPiece(createPiece());
        setNextPiece(createPiece());
      }
    }
  }, [currentPiece, gameOver, isPaused, createPiece, nextPiece]);

  const isValidMove = useCallback(
    (piece: Piece, newX: number, newY: number, newShape?: number[][]): boolean => {
      const shape = newShape || piece.shape;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = newX + x;
            const boardY = newY + y;
            if (
              boardX < 0 ||
              boardX >= BOARD_WIDTH ||
              boardY >= BOARD_HEIGHT ||
              (boardY >= 0 && board[boardY][boardX] !== null)
            ) {
              return false;
            }
          }
        }
      }
      return true;
    },
    [board]
  );

  const mergePieceToBoard = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = PIECE_COLORS[currentPiece.type] as any;
          }
        }
      });
    });

    setBoard(newBoard);

    const fullRows: number[] = [];
    newBoard.forEach((row, i) => {
      if (row.every(cell => cell !== null)) {
        fullRows.push(i);
      }
    });

    if (fullRows.length > 0) {
      const clearedBoard = newBoard.filter((_, i) => !fullRows.includes(i));
      const emptyRows = Array(fullRows.length)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(null));
      setBoard([...emptyRows, ...clearedBoard]);
      
      const points = [40, 100, 300, 1200][fullRows.length - 1] * level;
      setScore(s => s + points);
      setLinesCleared(l => l + fullRows.length);
      
      const newLevel = Math.floor((linesCleared + fullRows.length) / 10) + 1;
      if (newLevel !== level) {
        setLevel(newLevel);
      }
    }

    setCurrentPiece(null);
  }, [currentPiece, board, level, linesCleared]);

  const movePieceDown = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;

    if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
    } else {
      if (currentPiece.y <= 0) {
        setGameOver(true);
        setIsPaused(true);
        return;
      }
      mergePieceToBoard();
    }
  }, [currentPiece, isPaused, gameOver, isValidMove, mergePieceToBoard]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      const speed = Math.max(50, 400 - (level - 1) * 60);
      dropIntervalRef.current = setInterval(movePieceDown, speed);
      return () => {
        if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
      };
    }
  }, [movePieceDown, isPaused, gameOver, level]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;

    const rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map(row => row[i]).reverse()
    );

    if (isValidMove(currentPiece, currentPiece.x, currentPiece.y, rotated)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
    }
  }, [currentPiece, isPaused, gameOver, isValidMove]);

  const movePiece = useCallback(
    (dx: number) => {
      if (!currentPiece || isPaused || gameOver) return;

      if (isValidMove(currentPiece, currentPiece.x + dx, currentPiece.y)) {
        setCurrentPiece({ ...currentPiece, x: currentPiece.x + dx });
      }
    },
    [currentPiece, isPaused, gameOver, isValidMove]
  );

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;

    let newY = currentPiece.y;
    while (isValidMove(currentPiece, currentPiece.x, newY + 1)) {
      newY++;
    }
    setCurrentPiece({ ...currentPiece, y: newY });
    setTimeout(mergePieceToBoard, 50);
  }, [currentPiece, isPaused, gameOver, isValidMove, mergePieceToBoard]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          movePiece(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          movePiece(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          movePieceDown();
          break;
        case "ArrowUp":
        case " ":
          e.preventDefault();
          rotatePiece();
          break;
        case "Enter":
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [movePiece, movePieceDown, rotatePiece, hardDrop, gameOver]);

  const resetGame = () => {
    setBoard(
      Array(BOARD_HEIGHT)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(null))
    );
    setCurrentPiece(null);
    setNextPiece(null);
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setGameOver(false);
    setIsPaused(true);
    setScoreSaved(false);
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);

    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = PIECE_COLORS[currentPiece.type] as any;
            }
          }
        });
      });
    }

    return displayBoard;
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4 gap-6">
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🟦 Tetris
          </h1>
          <div className="flex items-center gap-4">
            {bestScore !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>Meilleur: {bestScore}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6 items-start justify-center">
          <div
            className="relative shadow-2xl overflow-hidden"
            style={{
              width: BOARD_WIDTH * CELL_SIZE,
              height: BOARD_HEIGHT * CELL_SIZE,
              background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%)",
              border: "4px solid #7c3aed",
              borderRadius: "8px",
            }}
          >
            {renderBoard().map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="absolute transition-all duration-75"
                  style={{
                    left: x * CELL_SIZE,
                    top: y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: cell
                      ? `linear-gradient(135deg, ${cell} 0%, ${cell}dd 100%)`
                      : "transparent",
                    border: cell ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: cell
                      ? "inset 2px 2px 4px rgba(255, 255, 255, 0.3), inset -2px -2px 4px rgba(0, 0, 0, 0.3)"
                      : "none",
                    borderRadius: "2px",
                  }}
                />
              ))
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-4 backdrop-blur-sm z-30">
                <div className="text-4xl font-bold text-red-500 animate-bounce">
                  Game Over!
                </div>
                <div className="text-2xl text-white">Score final: {score}</div>
              </div>
            )}

            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-30">
                <div className="text-3xl font-bold text-white animate-pulse">
                  PAUSE
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm font-semibold mb-1">Score</div>
              <div className="text-2xl font-bold">{score}</div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm font-semibold mb-1">Niveau</div>
              <div className="text-2xl font-bold">{level}</div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm font-semibold mb-1">Lignes</div>
              <div className="text-2xl font-bold">{linesCleared}</div>
            </div>
            {nextPiece && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="text-sm font-semibold mb-2">Suivant</div>
                <div
                  className="relative mx-auto"
                  style={{
                    width: 4 * CELL_SIZE * 0.6,
                    height: 4 * CELL_SIZE * 0.6,
                  }}
                >
                  {nextPiece.shape.map((row, y) =>
                    row.map(
                      (cell, x) =>
                        cell && (
                          <div
                            key={`${x}-${y}`}
                            className="absolute"
                            style={{
                              left: x * CELL_SIZE * 0.6,
                              top: y * CELL_SIZE * 0.6,
                              width: CELL_SIZE * 0.6,
                              height: CELL_SIZE * 0.6,
                              background: `linear-gradient(135deg, ${PIECE_COLORS[nextPiece.type]} 0%, ${PIECE_COLORS[nextPiece.type]}dd 100%)`,
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              boxShadow:
                                "inset 2px 2px 4px rgba(255, 255, 255, 0.3), inset -2px -2px 4px rgba(0, 0, 0, 0.3)",
                              borderRadius: "2px",
                            }}
                          />
                        )
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={() => router.push("/dashboard")} size="lg" variant="outline">
            <Home className="mr-2 h-5 w-5" />
            Dashboard
          </Button>
          <Button
            onClick={() => setIsPaused(!isPaused)}
            disabled={gameOver}
            size="lg"
            variant={isPaused ? "default" : "secondary"}
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-5 w-5" />
                Jouer
              </>
            ) : (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </>
            )}
          </Button>
          <Button onClick={resetGame} size="lg" variant="outline">
            <RotateCcw className="mr-2 h-5 w-5" />
            Recommencer
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">Instructions:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• ⬅️➡️ Déplacer la pièce</li>
            <li>• ⬆️ ou Espace pour faire pivoter</li>
            <li>• ⬇️ Accélérer la descente</li>
            <li>• Entrée pour chute rapide</li>
            <li>• Complétez des lignes pour marquer des points</li>
          </ul>
        </div>
      </div>

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
                    ? "bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20"
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
                  <p className="text-lg font-bold text-purple-500">
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
