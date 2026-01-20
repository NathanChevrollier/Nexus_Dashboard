"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Home, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Position = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

const useResponsiveCellSize = () => {
  const [cellSize, setCellSize] = useState(20);
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setCellSize(32);
      else if (width >= 1280) setCellSize(28);
      else if (width >= 1024) setCellSize(24);
      else if (width >= 768) setCellSize(20);
      else setCellSize(16);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return cellSize;
};

type LeaderboardEntry = {
  userId: string;
  userName: string;
  bestScore: number;
  createdAt: string;
};

export default function SnakeGame() {
  const router = useRouter();
  const { data: session } = useSession();
  const CELL_SIZE = useResponsiveCellSize();
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const directionRef = useRef<Direction>("RIGHT");

  // Charger le meilleur score au démarrage
  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=snake&userOnly=true");
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
        const res = await fetch("/api/games/scores?gameId=snake&limit=10");
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
      if (gameOver && score > 0 && !scoreSaved && session?.user) {
        setScoreSaved(true);
        try {
          const res = await fetch("/api/games/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: "snake",
              score,
              metadata: { snakeLength: snake.length },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isNewBest) {
              setBestScore(score);
            }
            // Recharger le leaderboard
            const leaderRes = await fetch("/api/games/scores?gameId=snake&limit=10");
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
  }, [gameOver, score, scoreSaved, session, snake.length]);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    generateFood();
    setGameOver(false);
    setIsPaused(true);
    setScore(0);
    setScoreSaved(false);
  };

  const checkCollision = (head: Position, snakeBody: Position[]) => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Self collision
    return snakeBody.some((segment) => segment.x === head.x && segment.y === head.y);
  };

  const moveSnake = useCallback(() => {
    if (isPaused || gameOver) return;

    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };

      switch (directionRef.current) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      if (checkCollision(head, prevSnake)) {
        setGameOver(true);
        setIsPaused(true);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check if food is eaten
      if (head.x === food.x && head.y === food.y) {
        setScore((s) => s + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [isPaused, gameOver, food, generateFood]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== "DOWN") {
            setDirection("UP");
            directionRef.current = "UP";
          }
          break;
        case "ArrowDown":
          if (directionRef.current !== "UP") {
            setDirection("DOWN");
            directionRef.current = "DOWN";
          }
          break;
        case "ArrowLeft":
          if (directionRef.current !== "RIGHT") {
            setDirection("LEFT");
            directionRef.current = "LEFT";
          }
          break;
        case "ArrowRight":
          if (directionRef.current !== "LEFT") {
            setDirection("RIGHT");
            directionRef.current = "RIGHT";
          }
          break;
        case " ":
          e.preventDefault();
          setIsPaused((p) => !p);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [moveSnake]);

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-green-950 to-emerald-900 p-4 gap-6">
      <div className="bg-card rounded-xl shadow-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🐍 Snake Game
          </h1>
          <div className="flex items-center gap-4">
            {bestScore !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>Meilleur: {bestScore}</span>
              </div>
            )}
            <div className="text-xl font-semibold">Score: {score}</div>
          </div>
        </div>

        <div
          className="relative mx-auto shadow-2xl overflow-hidden"
          style={{
            width: GRID_SIZE * CELL_SIZE + 16,
            height: GRID_SIZE * CELL_SIZE + 16,
            background: 'linear-gradient(135deg, #1a4d1a 0%, #0d260d 100%)',
            border: '8px solid transparent',
            borderImage: 'repeating-linear-gradient(45deg, #2d5016 0px, #2d5016 10px, #3d6b1f 10px, #3d6b1f 20px) 8',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(139, 195, 74, 0.3)',
          }}
        >
          {/* Texture d'herbe en fond */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(76, 175, 80, 0.3) 2px, rgba(76, 175, 80, 0.3) 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(76, 175, 80, 0.3) 2px, rgba(76, 175, 80, 0.3) 4px)
              `,
            }}
          />
          
          {/* Buissons décoratifs dans les coins */}
          <div className="absolute top-0 left-0 text-3xl" style={{ transform: 'translate(-4px, -4px)' }}>🌿</div>
          <div className="absolute top-0 right-0 text-3xl" style={{ transform: 'translate(4px, -4px)' }}>🌿</div>
          <div className="absolute bottom-0 left-0 text-3xl" style={{ transform: 'translate(-4px, 4px)' }}>🌿</div>
          <div className="absolute bottom-0 right-0 text-3xl" style={{ transform: 'translate(4px, 4px)' }}>🌿</div>
          
          <div
            className="relative w-full h-full"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              margin: '8px',
            }}
          >
          {/* Snake */}
          {snake.map((segment, index) => {
            const isHead = index === 0;
            const isTail = index === snake.length - 1;
            
            // Calculer la direction pour la rotation de la tête
            let rotation = 0;
            if (isHead) {
              switch (direction) {
                case "UP": rotation = 270; break;
                case "DOWN": rotation = 90; break;
                case "LEFT": rotation = 180; break;
                case "RIGHT": rotation = 0; break;
              }
            }

            return (
              <div
                key={index}
                className={cn(
                  "absolute transition-all duration-100 ease-linear",
                  isHead ? "z-10" : "z-0"
                )}
                style={{
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  transform: isHead ? `rotate(${rotation}deg)` : 'none',
                }}
              >
                {isHead ? (
                  // Tête du serpent avec texture réaliste
                  <div className="relative w-full h-full">
                    <div 
                      className="absolute inset-0 rounded-full shadow-xl" 
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #22c55e 40%, #16a34a 100%)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                      }}
                    >
                      {/* Motif écailles sur la tête */}
                      <div 
                        className="absolute inset-0 rounded-full opacity-40"
                        style={{
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0, 0, 0, 0.15) 2px, rgba(0, 0, 0, 0.15) 3px)',
                        }}
                      />
                    </div>
                    {/* Yeux brillants */}
                    <div 
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        top: '25%',
                        left: '25%',
                        background: 'radial-gradient(circle at 30% 30%, #fff 0%, #1f2937 40%, #000 100%)',
                        boxShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
                      }}
                    />
                    <div 
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        top: '25%',
                        right: '25%',
                        background: 'radial-gradient(circle at 30% 30%, #fff 0%, #1f2937 40%, #000 100%)',
                        boxShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
                      }}
                    />
                    {/* Langue */}
                    <div 
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-red-600 rounded-full"
                      style={{
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                      }}
                    />
                  </div>
                ) : (
                  // Corps du serpent avec texture écailles réaliste
                  <div className="relative w-full h-full">
                    <div 
                      className={cn(
                        "absolute inset-0.5 rounded-lg transition-all duration-100",
                      )}
                      style={{
                        background: isTail 
                          ? 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #14532d 100%)'
                          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      {/* Texture écailles hexagonales */}
                      <div 
                        className="absolute inset-0 rounded-lg opacity-50"
                        style={{
                          backgroundImage: `
                            radial-gradient(circle at 25% 25%, rgba(0, 0, 0, 0.2) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(0, 0, 0, 0.2) 0%, transparent 50%)
                          `,
                          backgroundSize: '8px 8px',
                        }}
                      />
                      {/* Reflet brillant */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1/2 rounded-t-lg"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Food - Fruit réaliste */}
          <div
            className="absolute transition-all duration-300"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Pomme réaliste */}
              <div 
                className="relative w-4/5 h-4/5 rounded-full animate-pulse"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ff6b6b 0%, #ff5252 30%, #dc143c 60%, #8b0000 100%)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(255, 255, 255, 0.4)',
                }}
              >
                {/* Reflet brillant */}
                <div 
                  className="absolute top-1 left-1 w-1/3 h-1/3 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
                  }}
                />
                {/* Tige */}
                <div 
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-2 rounded-t-full"
                  style={{
                    background: 'linear-gradient(180deg, #8b4513 0%, #654321 100%)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  }}
                />
                {/* Feuille */}
                <div 
                  className="absolute -top-1 left-1/2 w-2 h-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                    borderRadius: '0 50% 50% 0',
                    transform: 'rotate(-45deg) translateX(-2px)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
              <div className="text-4xl font-bold text-red-500 animate-bounce">
                Game Over!
              </div>
              <div className="text-2xl text-white">Score final: {score}</div>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <div className="text-3xl font-bold text-white animate-pulse">
                PAUSE
              </div>
            </div>
          )}
          </div>
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

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">Instructions:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Utilisez les flèches ⬆️⬇️⬅️➡️ pour diriger le serpent</li>
            <li>• Appuyez sur ESPACE pour mettre en pause</li>
            <li>• Mangez les pommes 🔴 pour grandir et marquer des points</li>
            <li>• Évitez les murs et votre propre queue !</li>
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
                  <p className="text-lg font-bold text-green-500">
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
