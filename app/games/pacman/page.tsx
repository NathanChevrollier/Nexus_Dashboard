"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Home, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Position = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | null;
type GhostMode = "chase" | "scatter" | "frightened" | "eaten";
type Ghost = { x: number; y: number; color: string; name: string; mode: GhostMode; scatterTarget: Position };

type LeaderboardEntry = {
  userId: string;
  userName: string;
  bestScore: number;
  createdAt: string;
};

const GRID_WIDTH = 28;
const GRID_HEIGHT = 31;
const INITIAL_SPEED = 150;

const useResponsiveCellSize = () => {
  const [cellSize, setCellSize] = useState(16);
  
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setCellSize(24);
      else if (width >= 1280) setCellSize(20);
      else if (width >= 1024) setCellSize(18);
      else if (width >= 768) setCellSize(16);
      else setCellSize(14);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return cellSize;
};

// Labyrinthe Pac-Man classique simplifié (1 = mur, 0 = chemin, 2 = point, 3 = power pellet)
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,0,0,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export default function PacmanGame() {
  const router = useRouter();
  const { data: session } = useSession();
  const CELL_SIZE = useResponsiveCellSize();
  
  const [pacman, setPacman] = useState<Position>({ x: 14, y: 23 });
  const [direction, setDirection] = useState<Direction>(null);
  const [nextDirection, setNextDirection] = useState<Direction>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 12, y: 14, color: "#FF0000", name: "Blinky", mode: "scatter", scatterTarget: { x: 25, y: 1 } },
    { x: 14, y: 14, color: "#FFB8FF", name: "Pinky", mode: "scatter", scatterTarget: { x: 2, y: 1 } },
    { x: 13, y: 14, color: "#00FFFF", name: "Inky", mode: "scatter", scatterTarget: { x: 25, y: 29 } },
    { x: 15, y: 14, color: "#FFB852", name: "Clyde", mode: "scatter", scatterTarget: { x: 2, y: 29 } },
  ]);
  const [ghostsReleased, setGhostsReleased] = useState<boolean[]>([false, false, false, false]);
  const [powerPelletActive, setPowerPelletActive] = useState(false);
  const [powerPelletTimer, setPowerPelletTimer] = useState(0);
  const [maze, setMaze] = useState<number[][]>(MAZE.map(row => [...row]));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mouthOpen, setMouthOpen] = useState(true);
  
  const directionRef = useRef<Direction>(null);
  const nextDirectionRef = useRef<Direction>(null);
  const pacmanRef = useRef<Position>({ x: 14, y: 23 });
  const isPausedRef = useRef(true);
  const gameOverRef = useRef(false);

  useEffect(() => {
    pacmanRef.current = pacman;
  }, [pacman]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      const timers = [
        setTimeout(() => setGhostsReleased(prev => [true, prev[1], prev[2], prev[3]]), 0),
        setTimeout(() => setGhostsReleased(prev => [prev[0], true, prev[2], prev[3]]), 2000),
        setTimeout(() => setGhostsReleased(prev => [prev[0], prev[1], true, prev[3]]), 4000),
        setTimeout(() => setGhostsReleased(prev => [prev[0], prev[1], prev[2], true]), 6000),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isPaused, gameOver]);

  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=pacman&userOnly=true");
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
        const res = await fetch("/api/games/scores?gameId=pacman&limit=10");
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
              gameId: "pacman",
              score,
              metadata: { dotsEaten: 244 - maze.flat().filter(c => c === 2).length },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isNewBest) setBestScore(score);
            const leaderRes = await fetch("/api/games/scores?gameId=pacman&limit=10");
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
  }, [gameOver, score, scoreSaved, session, maze]);

  const canMove = (x: number, y: number, isGhost: boolean = false) => {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    const cell = maze[y][x];
    if (cell === 1) return false;
    if (!isGhost && cell === 0) return false;
    return true;
  };

  const movePacman = useCallback(() => {
    if (isPaused || gameOver) return;

    setPacman(prev => {
      let newDirection = directionRef.current;
      
      if (nextDirectionRef.current) {
        let nextX = prev.x;
        let nextY = prev.y;
        
        switch (nextDirectionRef.current) {
          case "UP": nextY--; break;
          case "DOWN": nextY++; break;
          case "LEFT": nextX--; break;
          case "RIGHT": nextX++; break;
        }
        
        if (canMove(nextX, nextY)) {
          newDirection = nextDirectionRef.current;
          directionRef.current = newDirection;
          nextDirectionRef.current = null;
        }
      }

      if (!newDirection) return prev;

      let newX = prev.x;
      let newY = prev.y;

      switch (newDirection) {
        case "UP": newY--; break;
        case "DOWN": newY++; break;
        case "LEFT": newX--; break;
        case "RIGHT": newX++; break;
      }

      if (newX < 0) newX = GRID_WIDTH - 1;
      if (newX >= GRID_WIDTH) newX = 0;

      if (!canMove(newX, newY)) return prev;

      const cellValue = maze[newY][newX];
      if (cellValue === 2) {
        setScore(s => s + 10);
        setMaze(m => {
          const newMaze = m.map(row => [...row]);
          newMaze[newY][newX] = 0;
          return newMaze;
        });
      } else if (cellValue === 3) {
        setScore(s => s + 50);
        setMaze(m => {
          const newMaze = m.map(row => [...row]);
          newMaze[newY][newX] = 0;
          return newMaze;
        });
        setPowerPelletActive(true);
        setPowerPelletTimer(8000);
        setGhosts(g => g.map(ghost => ({ ...ghost, mode: "frightened" as GhostMode })));
      }

      return { x: newX, y: newY };
    });

    setMouthOpen(m => !m);
  }, [isPaused, gameOver, maze]);

  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const moveGhosts = useCallback(() => {
    if (isPausedRef.current || gameOverRef.current) return;

    setGhosts(prevGhosts => 
      prevGhosts.map((ghost, index) => {
        if (!ghostsReleased[index]) {
          if (ghost.y > 11) {
            return { ...ghost, y: ghost.y - 1 };
          }
          return ghost;
        }

        if (ghost.mode === "eaten") {
          const homeX = 14;
          const homeY = 14;
          if (ghost.x === homeX && ghost.y === homeY) {
            return ghost;
          }
          const dx = homeX - ghost.x;
          const dy = homeY - ghost.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            const newX = ghost.x + (dx > 0 ? 1 : -1);
            if (canMove(newX, ghost.y, true)) {
              return { ...ghost, x: newX };
            }
          } else {
            const newY = ghost.y + (dy > 0 ? 1 : -1);
            if (canMove(ghost.x, newY, true)) {
              return { ...ghost, y: newY };
            }
          }
          return ghost;
        }

        const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
        const validMoves = directions.filter(dir => {
          let newX = ghost.x;
          let newY = ghost.y;
          switch (dir) {
            case "UP": newY--; break;
            case "DOWN": newY++; break;
            case "LEFT": newX--; break;
            case "RIGHT": newX++; break;
          }
          return canMove(newX, newY, true);
        });

        if (validMoves.length === 0) return ghost;

        let targetX = pacmanRef.current.x;
        let targetY = pacmanRef.current.y;

        if (ghost.mode === "frightened") {
          const randomDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          let newX = ghost.x;
          let newY = ghost.y;
          switch (randomDir) {
            case "UP": newY--; break;
            case "DOWN": newY++; break;
            case "LEFT": newX--; break;
            case "RIGHT": newX++; break;
          }
          return { ...ghost, x: newX, y: newY };
        }

        if (ghost.mode === "scatter") {
          targetX = ghost.scatterTarget.x;
          targetY = ghost.scatterTarget.y;
        } else if (ghost.mode === "chase") {
          if (ghost.name === "Blinky") {
            targetX = pacmanRef.current.x;
            targetY = pacmanRef.current.y;
          } else if (ghost.name === "Pinky") {
            targetX = pacmanRef.current.x;
            targetY = pacmanRef.current.y;
            switch (directionRef.current) {
              case "UP": targetY -= 4; break;
              case "DOWN": targetY += 4; break;
              case "LEFT": targetX -= 4; break;
              case "RIGHT": targetX += 4; break;
            }
          } else if (ghost.name === "Inky") {
            const blinky = prevGhosts.find(g => g.name === "Blinky");
            if (blinky) {
              let pivotX = pacmanRef.current.x;
              let pivotY = pacmanRef.current.y;
              switch (directionRef.current) {
                case "UP": pivotY -= 2; break;
                case "DOWN": pivotY += 2; break;
                case "LEFT": pivotX -= 2; break;
                case "RIGHT": pivotX += 2; break;
              }
              targetX = pivotX + (pivotX - blinky.x);
              targetY = pivotY + (pivotY - blinky.y);
            }
          } else if (ghost.name === "Clyde") {
            const distance = getDistance(ghost.x, ghost.y, pacmanRef.current.x, pacmanRef.current.y);
            if (distance > 8) {
              targetX = pacmanRef.current.x;
              targetY = pacmanRef.current.y;
            } else {
              targetX = ghost.scatterTarget.x;
              targetY = ghost.scatterTarget.y;
            }
          }
        }

        let bestDir = validMoves[0];
        let bestDistance = Infinity;

        validMoves.forEach(dir => {
          let newX = ghost.x;
          let newY = ghost.y;
          switch (dir) {
            case "UP": newY--; break;
            case "DOWN": newY++; break;
            case "LEFT": newX--; break;
            case "RIGHT": newX++; break;
          }
          const distance = getDistance(newX, newY, targetX, targetY);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestDir = dir;
          }
        });

        let newX = ghost.x;
        let newY = ghost.y;
        switch (bestDir) {
          case "UP": newY--; break;
          case "DOWN": newY++; break;
          case "LEFT": newX--; break;
          case "RIGHT": newX++; break;
        }

        return { ...ghost, x: newX, y: newY };
      })
    );
  }, [ghostsReleased]);

  useEffect(() => {
    ghosts.forEach((ghost, index) => {
      if (ghost.x === pacman.x && ghost.y === pacman.y) {
        if (ghost.mode === "frightened") {
          setScore(s => s + 200);
          setGhosts(g => {
            const newGhosts = [...g];
            newGhosts[index] = { ...ghost, x: 14, y: 14, mode: "eaten" };
            return newGhosts;
          });
          setTimeout(() => {
            setGhosts(g => {
              const newGhosts = [...g];
              newGhosts[index] = { ...newGhosts[index], mode: "chase" };
              return newGhosts;
            });
          }, 3000);
        } else if (ghost.mode !== "eaten") {
          setGameOver(true);
          setIsPaused(true);
        }
      }
    });
  }, [ghosts, pacman]);

  useEffect(() => {
    if (powerPelletActive && powerPelletTimer > 0) {
      const interval = setInterval(() => {
        setPowerPelletTimer(t => {
          if (t <= 100) {
            setPowerPelletActive(false);
            setGhosts(g => g.map(ghost => 
              ghost.mode === "frightened" ? { ...ghost, mode: "chase" } : ghost
            ));
            return 0;
          }
          return t - 100;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [powerPelletActive, powerPelletTimer]);

  useEffect(() => {
    const modeInterval = setInterval(() => {
      if (!powerPelletActive && !isPaused && !gameOver) {
        setGhosts(g => g.map(ghost => {
          if (ghost.mode === "eaten") return ghost;
          const newMode = ghost.mode === "chase" ? "scatter" : "chase";
          return { ...ghost, mode: newMode };
        }));
      }
    }, 7000);
    return () => clearInterval(modeInterval);
  }, [powerPelletActive, isPaused, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          nextDirectionRef.current = "UP";
          setNextDirection("UP");
          break;
        case "ArrowDown":
          e.preventDefault();
          nextDirectionRef.current = "DOWN";
          setNextDirection("DOWN");
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextDirectionRef.current = "LEFT";
          setNextDirection("LEFT");
          break;
        case "ArrowRight":
          e.preventDefault();
          nextDirectionRef.current = "RIGHT";
          setNextDirection("RIGHT");
          break;
        case " ":
          e.preventDefault();
          setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(movePacman, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [movePacman]);

  useEffect(() => {
    const interval = setInterval(moveGhosts, INITIAL_SPEED * 1.5);
    return () => clearInterval(interval);
  }, [moveGhosts]);

  const resetGame = () => {
    setPacman({ x: 14, y: 23 });
    setDirection(null);
    setNextDirection(null);
    directionRef.current = null;
    nextDirectionRef.current = null;
    setGhosts([
      { x: 12, y: 14, color: "#FF0000", name: "Blinky", mode: "scatter", scatterTarget: { x: 25, y: 1 } },
      { x: 14, y: 14, color: "#FFB8FF", name: "Pinky", mode: "scatter", scatterTarget: { x: 2, y: 1 } },
      { x: 13, y: 14, color: "#00FFFF", name: "Inky", mode: "scatter", scatterTarget: { x: 25, y: 29 } },
      { x: 15, y: 14, color: "#FFB852", name: "Clyde", mode: "scatter", scatterTarget: { x: 2, y: 29 } },
    ]);
    setGhostsReleased([false, false, false, false]);
    setPowerPelletActive(false);
    setPowerPelletTimer(0);
    setMaze(MAZE.map(row => [...row]));
    setScore(0);
    setGameOver(false);
    setIsPaused(true);
    setScoreSaved(false);
  };

  const getRotation = () => {
    switch (directionRef.current) {
      case "UP": return 270;
      case "DOWN": return 90;
      case "LEFT": return 180;
      case "RIGHT": return 0;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 gap-6">
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            👻 Pac-Man
          </h1>
          <div className="flex items-center gap-4">
            {bestScore !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>Meilleur: {bestScore}</span>
              </div>
            )}
            {powerPelletActive && (
              <div className="flex items-center gap-2 text-sm font-bold text-blue-400 animate-pulse">
                <span>⚡ Power: {Math.ceil(powerPelletTimer / 1000)}s</span>
              </div>
            )}
            <div className="text-xl font-semibold">Score: {score}</div>
          </div>
        </div>

        <div
          className="relative mx-auto shadow-2xl overflow-hidden"
          style={{
            width: GRID_WIDTH * CELL_SIZE,
            height: GRID_HEIGHT * CELL_SIZE,
            background: '#000',
            border: '4px solid #2563eb',
            borderRadius: '8px',
          }}
        >
          {/* Maze */}
          {maze.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className="absolute"
                style={{
                  left: x * CELL_SIZE,
                  top: y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                {cell === 1 && (
                  <div className="w-full h-full bg-blue-600 border border-blue-400" style={{ borderRadius: '2px' }} />
                )}
                {cell === 2 && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  </div>
                )}
                {cell === 3 && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-300 animate-pulse" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Pac-Man */}
          <div
            className="absolute transition-all duration-75 ease-linear z-20"
            style={{
              left: pacman.x * CELL_SIZE,
              top: pacman.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              transform: `rotate(${getRotation()}deg)`,
            }}
          >
            <div className="relative w-full h-full">
              {mouthOpen ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, #FFD700 0%, #FFA500 100%)',
                    clipPath: 'polygon(100% 50%, 50% 0%, 0% 0%, 0% 100%, 50% 100%)',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, #FFD700 0%, #FFA500 100%)',
                  }}
                />
              )}
            </div>
          </div>

          {/* Ghosts */}
          {ghosts.map((ghost, i) => {
            const isFrightened = ghost.mode === "frightened";
            const isBlinking = isFrightened && powerPelletTimer < 2000;
            const ghostColor = isFrightened 
              ? (isBlinking && Math.floor(powerPelletTimer / 200) % 2 === 0 ? "#FFFFFF" : "#0000FF")
              : ghost.color;
            
            return (
            <div
              key={i}
              className="absolute transition-all duration-150 ease-linear z-10"
              style={{
                left: ghost.x * CELL_SIZE,
                top: ghost.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            >
              <div className="relative w-full h-full">
                <div
                  className="absolute inset-0"
                  style={{
                    background: ghostColor,
                    borderRadius: '50% 50% 0 0',
                    boxShadow: 'inset 0 -2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 flex">
                  <div className="flex-1 bg-inherit rounded-b-full" style={{ background: ghostColor }} />
                  <div className="flex-1 bg-inherit rounded-b-full" style={{ background: ghostColor }} />
                  <div className="flex-1 bg-inherit rounded-b-full" style={{ background: ghostColor }} />
                </div>
                {isFrightened ? (
                  <>
                    <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-white rounded-full" />
                    <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full" />
                    <div className="absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-white" style={{ borderRadius: '2px' }} />
                  </>
                ) : (
                  <>
                    <div className="absolute top-1/4 left-1/4 w-1 h-1.5 bg-white rounded-full" />
                    <div className="absolute top-1/4 right-1/4 w-1 h-1.5 bg-white rounded-full" />
                    <div className="absolute top-1/3 left-1/4 w-0.5 h-0.5 bg-blue-900 rounded-full" />
                    <div className="absolute top-1/3 right-1/4 w-0.5 h-0.5 bg-blue-900 rounded-full" />
                  </>
                )}
              </div>
            </div>
          )})}

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

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={() => router.push("/dashboard")} size="lg" variant="outline">
            <Home className="mr-2 h-5 w-5" />
            Dashboard
          </Button>
          <Button onClick={() => setIsPaused(!isPaused)} disabled={gameOver} size="lg" variant={isPaused ? "default" : "secondary"}>
            {isPaused ? <><Play className="mr-2 h-5 w-5" />Jouer</> : <><Pause className="mr-2 h-5 w-5" />Pause</>}
          </Button>
          <Button onClick={resetGame} size="lg" variant="outline">
            <RotateCcw className="mr-2 h-5 w-5" />
            Recommencer
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">Instructions:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Utilisez les flèches ⬆️⬇️⬅️➡️ pour diriger Pac-Man</li>
            <li>• Mangez tous les points pour gagner</li>
            <li>• Évitez les fantômes normaux !</li>
            <li>• Les gros points (power pellets) valent 50 points et vous permettent de manger les fantômes pendant 8 secondes</li>
            <li>• Fantômes bleus = vulnérables (200 pts chacun) 👍</li>
            <li>• Fantômes qui clignotent blanc = l'effet se termine bientôt ! ⚠️</li>
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
                  <p className="text-lg font-bold text-yellow-500">
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
