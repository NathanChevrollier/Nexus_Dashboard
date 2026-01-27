"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// --- TYPES & CONFIG ---
type Position = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | null;
type GhostMode = "CHASE" | "SCATTER" | "FRIGHTENED" | "EATEN" | "EXITING_HOUSE";

type Ghost = {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  startPos: Position;
  dir: Direction;
  mode: GhostMode;
  speedMultiplier: number;
};

// Grille : 1=Mur, 0=Vide, 2=Point, 3=SuperPoint, 4=Porte Fantôme, 9=Interdit (House interior)
const GRID_WIDTH = 28;
const GRID_HEIGHT = 31;

const ORIGINAL_MAZE = [
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
  [1,1,1,1,1,1,2,1,1,0,1,1,4,4,4,4,1,1,0,1,1,2,1,1,1,1,1,1], // Ligne 12: Porte (4)
  [1,1,1,1,1,1,2,1,1,0,1,9,9,9,9,9,9,1,0,1,1,2,1,1,1,1,1,1], // Ligne 13: Interieur (9)
  [0,0,0,0,0,0,2,0,0,0,1,9,9,9,9,9,9,1,0,0,0,2,0,0,0,0,0,0], // Ligne 14: Spawn fantomes
  [1,1,1,1,1,1,2,1,1,0,1,9,9,9,9,9,9,1,0,1,1,2,1,1,1,1,1,1],
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

export default function PacmanArcade() {
  const router = useRouter();
  const { data: session } = useSession();

  // --- STATE & REFS ---
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER" | "WON">("IDLE");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  
  const formatLeaderboard = (data: any[]) =>
    (data || []).map(entry => ({
        userId: entry.userId,
        name: entry.userName || entry.name || 'Anonyme',
        score: entry.score ?? entry.bestScore ?? 0
    }));

  const [pacmanPos, setPacmanPos] = useState<Position>({ x: 14, y: 23 });
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [maze, setMaze] = useState(ORIGINAL_MAZE);
  const [pacmanDir, setPacmanDir] = useState<Direction>("RIGHT");
  
  // Refs pour le Game Loop (Performance)
  const pacmanRef = useRef({ x: 14, y: 23, dir: "RIGHT" as Direction, nextDir: "RIGHT" as Direction });
  const ghostsRef = useRef<Ghost[]>([]);
  const mazeRef = useRef(ORIGINAL_MAZE.map(row => [...row]));
  const scoreRef = useRef(0);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const powerModeTimerRef = useRef<number>(0);

  // Responsive Grid Calculation
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialisation des fantômes avec des propriétés distinctes
  const initGhosts = (): Ghost[] => [
    { id: 1, name: "Blinky", color: "#FF0000", x: 14, y: 11, startPos: {x:14, y:11}, dir: "LEFT", mode: "CHASE", speedMultiplier: 1 }, // Dehors
    { id: 2, name: "Pinky", color: "#FFB8FF", x: 14, y: 14, startPos: {x:14, y:14}, dir: "UP", mode: "EXITING_HOUSE", speedMultiplier: 0.9 }, // Dedans
    { id: 3, name: "Inky", color: "#00FFFF", x: 12, y: 14, startPos: {x:12, y:14}, dir: "UP", mode: "EXITING_HOUSE", speedMultiplier: 0.8 }, // Dedans
    { id: 4, name: "Clyde", color: "#FFB852", x: 15, y: 14, startPos: {x:15, y:14}, dir: "UP", mode: "EXITING_HOUSE", speedMultiplier: 0.8 }, // Dedans
  ];

  // --- RESPONSIVE SCALING ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        // On cherche à faire tenir la grille (28 * 20px de base = 560px de large)
        const gridW = GRID_WIDTH * 20;
        const gridH = GRID_HEIGHT * 20;
        
        let availableHeight = windowHeight - 200; // Espace pour UI haut/bas
        let availableWidth = windowWidth - 40;

        if (windowWidth < 768) {
           availableHeight = windowHeight - 300; // Plus d'espace pour les contrôles mobiles
        }

        const scaleW = availableWidth / gridW;
        const scaleH = availableHeight / gridH;
        
        // On prend le plus petit scale pour que ça rentre entièrement
        const newScale = Math.min(scaleW, scaleH, 1.5); 
        setScale(Math.max(newScale, 0.5)); // Min scale 0.5
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=pacman&userOnly=true");
        if (res.ok) {
          const data = await res.json();
          if (data?.score) setHighScore(data.score);
        }
      } catch (e) { console.error(e); }
    };

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=pacman&limit=5");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setLeaderboard(formatLeaderboard(data));
        }
      } catch (e) { console.error(e); }
    };

    fetchBestScore();
    fetchLeaderboard();
  }, []);

  // --- GAME LOGIC HELPERS ---

  const isWall = (x: number, y: number, isGhost = false, ghostMode?: GhostMode) => {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false; // Tunnel
    const cell = mazeRef.current[y][x];
    
    // Mur physique
    if (cell === 1) return true;
    
    // Gestion Porte Fantôme (4) et Intérieur (9)
    if (isGhost) {
      if (ghostMode === "EXITING_HOUSE" || ghostMode === "EATEN") return false; // Passe à travers tout
      if (cell === 4 || cell === 9) return true; // Bloqué sinon
    } else {
        // Pacman ne passe jamais dans la maison
        if (cell === 4 || cell === 9) return true;
    }
    return false;
  };

  const getOpposite = (dir: Direction) => {
    if (dir === "UP") return "DOWN";
    if (dir === "DOWN") return "UP";
    if (dir === "LEFT") return "RIGHT";
    if (dir === "RIGHT") return "LEFT";
    return null;
  };

  // --- MOVEMENT ENGINE ---
  const updateGame = (timestamp: number) => {
    if (gameState !== "PLAYING") return;
    
    const deltaTime = timestamp - lastTimeRef.current;
    
    // Ralentir la boucle pour simuler la vitesse arcade (tous les ~120ms)
    if (deltaTime < 120) {
        frameRef.current = requestAnimationFrame(updateGame);
        return;
    }
    lastTimeRef.current = timestamp;

    // 1. PACMAN MOVEMENT
    let nextX = pacmanRef.current.x;
    let nextY = pacmanRef.current.y;
    let turnX = pacmanRef.current.x;
    let turnY = pacmanRef.current.y;

    // Tentative de tourner (Buffer)
    if (pacmanRef.current.nextDir !== pacmanRef.current.dir) {
        if (pacmanRef.current.nextDir === "UP") turnY--;
        if (pacmanRef.current.nextDir === "DOWN") turnY++;
        if (pacmanRef.current.nextDir === "LEFT") turnX--;
        if (pacmanRef.current.nextDir === "RIGHT") turnX++;
        
        if (!isWall(turnX, turnY)) {
            pacmanRef.current.dir = pacmanRef.current.nextDir;
        }
    }

    if (pacmanRef.current.dir === "UP") nextY--;
    if (pacmanRef.current.dir === "DOWN") nextY++;
    if (pacmanRef.current.dir === "LEFT") nextX--;
    if (pacmanRef.current.dir === "RIGHT") nextX++;

    // Tunnel
    if (nextX <= -1) nextX = GRID_WIDTH - 1;
    if (nextX >= GRID_WIDTH) nextX = 0;

    if (!isWall(nextX, nextY)) {
        pacmanRef.current.x = nextX;
        pacmanRef.current.y = nextY;
        
        // Manger
        const cell = mazeRef.current[nextY][nextX];
        if (cell === 2 || cell === 3) {
            mazeRef.current[nextY][nextX] = 0;
            scoreRef.current += (cell === 3 ? 50 : 10);
            
            if (cell === 3) {
                // Power Pellet
                powerModeTimerRef.current = 60; // Environ 8-10 secondes
                ghostsRef.current.forEach(g => {
                    if (g.mode !== "EATEN" && g.mode !== "EXITING_HOUSE") g.mode = "FRIGHTENED";
                });
            }

            // Win condition
            const dotsLeft = mazeRef.current.flat().filter(c => c === 2 || c === 3).length;
            if (dotsLeft === 0) {
                setGameState("WON");
            }
        }
    }

    // 2. GHOST AI
    if (powerModeTimerRef.current > 0) {
        powerModeTimerRef.current--;
        if (powerModeTimerRef.current <= 0) {
            ghostsRef.current.forEach(g => {
                if (g.mode === "FRIGHTENED") g.mode = "CHASE";
            });
        }
    }

    ghostsRef.current = ghostsRef.current.map(ghost => {
        // --- LOGIQUE DE CIBLE ---
        let targetX = pacmanRef.current.x;
        let targetY = pacmanRef.current.y;

        if (ghost.mode === "EXITING_HOUSE") {
            // Cible = La porte de sortie (13.5, 11) -> case 13,11 ou 14,11
            targetX = 14; 
            targetY = 11;
            // Si on atteint la sortie, on passe en chasse
            if (ghost.y === 11) return { ...ghost, mode: "CHASE", dir: "LEFT" };
        } 
        else if (ghost.mode === "EATEN") {
            // Target: center of ghost house
            targetX = 14; 
            targetY = 14;
            // Check if ghost reached the base
            if (ghost.x === 14 && ghost.y === 14) {
                return { ...ghost, mode: "EXITING_HOUSE", speedMultiplier: 0.9 };
            }
        }
        else if (ghost.mode === "FRIGHTENED") {
            // Random target
            targetX = Math.floor(Math.random() * GRID_WIDTH);
            targetY = Math.floor(Math.random() * GRID_HEIGHT);
        }
        else if (ghost.mode === "CHASE") {
             // Personnalité
             if (ghost.name === "Pinky") { 
                 // Essaye d'anticiper (4 cases devant Pacman)
                 if (pacmanRef.current.dir === "UP") targetY -= 4;
                 if (pacmanRef.current.dir === "DOWN") targetY += 4;
                 if (pacmanRef.current.dir === "LEFT") targetX -= 4;
                 if (pacmanRef.current.dir === "RIGHT") targetX += 4;
             }
             else if (ghost.name === "Inky" || ghost.name === "Clyde") {
                 // Un peu aléatoire pour Inky/Clyde
                 if (Math.random() > 0.6) {
                    targetX = Math.floor(Math.random() * GRID_WIDTH);
                    targetY = Math.floor(Math.random() * GRID_HEIGHT);
                 }
             }
             // Blinky garde target = Pacman direct
        }

        // --- CHOIX DE DIRECTION ---
        const possibleMoves: {x:number, y:number, d:Direction, dist:number}[] = [];
        const dirs: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

        dirs.forEach(d => {
            // INTERDICTION DE FAIRE DEMI-TOUR (Sauf si frightened ou dans la maison)
            if (ghost.mode !== "FRIGHTENED" && ghost.mode !== "EXITING_HOUSE" && ghost.mode !== "EATEN") {
                if (d === getOpposite(ghost.dir)) return;
            }

            let gx = ghost.x;
            let gy = ghost.y;
            if (d === "UP") gy--;
            if (d === "DOWN") gy++;
            if (d === "LEFT") gx--;
            if (d === "RIGHT") gx++;

            // Tunnel handling for ghosts
            if (gx < 0) gx = GRID_WIDTH - 1;
            if (gx >= GRID_WIDTH) gx = 0;

            if (!isWall(gx, gy, true, ghost.mode)) {
                // Calcul distance euclidienne carrée (plus rapide)
                const dist = Math.pow(gx - targetX, 2) + Math.pow(gy - targetY, 2);
                possibleMoves.push({ x: gx, y: gy, d, dist });
            }
        });

        if (possibleMoves.length > 0) {
            // Trier par distance la plus courte vers la cible
            possibleMoves.sort((a, b) => a.dist - b.dist);
            // Prendre le meilleur (ou un random si frightened)
            const best = (ghost.mode === "FRIGHTENED" && Math.random() > 0.3) 
                ? possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
                : possibleMoves[0];
            
            return { ...ghost, x: best.x, y: best.y, dir: best.d };
        }
        
        // Cul de sac (ne devrait pas arriver souvent dans pacman) -> Demi tour
        return { ...ghost, dir: getOpposite(ghost.dir) };
    });

    // 3. COLLISION CHECK
    ghostsRef.current.forEach((g, idx) => {
        if (g.x === pacmanRef.current.x && g.y === pacmanRef.current.y) {
            if (g.mode === "FRIGHTENED") {
                scoreRef.current += 200;
                ghostsRef.current[idx] = {
                    ...ghostsRef.current[idx],
                    mode: "EATEN",
                    speedMultiplier: 2 // Ghosts return faster when eaten
                };
            } else if (g.mode === "CHASE" || g.mode === "SCATTER" || g.mode === "EXITING_HOUSE") {
                setGameState("GAMEOVER");
            }
        }
    });

    // Sync State for React Render
    setPacmanPos({ x: pacmanRef.current.x, y: pacmanRef.current.y });
    setPacmanDir(pacmanRef.current.dir);
    setGhosts([...ghostsRef.current]);
    setScore(scoreRef.current);
    setMaze([...mazeRef.current]);

    frameRef.current = requestAnimationFrame(updateGame);
  };

  // --- CONTROLS ---
  const handleKeyDown = useCallback((key: string) => {
    if (gameState !== "PLAYING" && key === "Space") {
        if (gameState === "IDLE" || gameState === "GAMEOVER" || gameState === "WON") startGame();
        else setGameState(prev => prev === "PAUSED" ? "PLAYING" : "PAUSED");
        return;
    }

    let newDir: Direction = null;
    if (key === "ArrowUp") newDir = "UP";
    if (key === "ArrowDown") newDir = "DOWN";
    if (key === "ArrowLeft") newDir = "LEFT";
    if (key === "ArrowRight") newDir = "RIGHT";

    if (newDir) {
        pacmanRef.current.nextDir = newDir;
        // Si au démarrage
        if (gameState === "IDLE") startGame();
    }
  }, [gameState]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
        handleKeyDown(e.key === " " ? "Space" : e.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKeyDown]);

  const startGame = () => {
    setGameState("PLAYING");
    if (scoreRef.current === 0 || gameState === "GAMEOVER" || gameState === "WON") {
        resetGame();
        setGameState("PLAYING");
    }
    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(updateGame);
  };

  const resetGame = () => {
    setMaze(ORIGINAL_MAZE.map(r => [...r]));
    mazeRef.current = ORIGINAL_MAZE.map(r => [...r]);
    setScore(0);
    scoreRef.current = 0;
    setPacmanPos({ x: 14, y: 23 });
    pacmanRef.current = { x: 14, y: 23, dir: "RIGHT", nextDir: "RIGHT" };
    const newGhosts = initGhosts();
    setGhosts(newGhosts);
    ghostsRef.current = newGhosts;
  };

  // Clean up loop
  useEffect(() => {
    if (gameState !== "PLAYING") {
        cancelAnimationFrame(frameRef.current);
    } else {
        frameRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState]);


  // --- RENDER ---
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-2 font-mono text-white overflow-hidden relative">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 z-50 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" /> {/* CRT Effect */}

      {/* HEADER */}
      <div className="z-10 w-full max-w-4xl flex justify-between items-center mb-2 px-4">
        <div className="flex flex-col">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                PAC-MAN
            </h1>
            <span className="text-xs text-blue-400 tracking-widest">NEON EDITION</span>
        </div>
        
        <div className="flex gap-6">
            <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Score</p>
                <p className="text-xl font-bold text-white tabular-nums">{score}</p>
            </div>
            <div className="text-center hidden sm:block">
                <p className="text-xs text-gray-500 uppercase">High Score</p>
                <p className="text-xl font-bold text-yellow-500 tabular-nums">{Math.max(score, highScore)}</p>
            </div>
        </div>
      </div>

    {/* GAME CONTAINER WITH SIDE LEADERBOARD */}
    <div className="relative z-10 flex flex-col lg:flex-row lg:flex-nowrap items-center lg:items-start justify-center gap-6">
        
        {/* LEADERBOARD (DESKTOP ONLY - LEFT SIDE) */}
                <div className="hidden lg:block w-[240px] shrink-0 self-start z-30">
                    <div className="bg-neutral-800/90 border-2 border-yellow-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm relative">
              <h3 className="text-base font-bold flex items-center gap-2 text-white mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" /> Classement
              </h3>
              {leaderboard.length === 0 ? (
                  <p className="text-sm text-neutral-400">Aucun score</p>
              ) : (
                  <div className="space-y-2">
                      {leaderboard.map((entry, index) => {
                          const name = (entry as any).userName || (entry as any).name || 'Anonyme';
                          const score = (entry as any).score ?? (entry as any).bestScore ?? 0;
                          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`;
                          return (
                              <div
                                  key={(entry as any).userId || name + index}
                                  className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg transition-colors",
                                      index < 3 ? "bg-yellow-500/20 border border-yellow-500/50" : "bg-neutral-700/60 border border-neutral-600/30"
                                  )}
                              >
                                  <div className="w-6 text-center text-sm">{medal}</div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate text-white">{name}</p>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-yellow-400">{score.toLocaleString()}</div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
        </div>

        {/* GAME CANVAS */}
        <div className="flex flex-col items-center">
            <div 
                ref={containerRef}
                className="relative bg-black/80 rounded-lg shadow-2xl border-[3px] border-blue-900/50 backdrop-blur-sm overflow-hidden transition-transform duration-300 shrink-0 ml-2"
                style={{ 
                    width: GRID_WIDTH * 20, 
                    height: GRID_HEIGHT * 20,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    willChange: 'transform'
                }}
            >
                {/* MAZE RENDERING */}
                {maze.map((row, y) => row.map((cell, x) => {
                    if (cell === 0) return null;
                    // Walls
                    if (cell === 1) return (
                        <div key={`${x}-${y}`} className="absolute w-[20px] h-[20px] bg-blue-900/30 border border-blue-500/40 shadow-[0_0_5px_rgba(37,99,235,0.2)] rounded-[2px]" style={{ left: x*20, top: y*20 }} />
                    );
                    // House Door
                    if (cell === 4) return (
                        <div key={`${x}-${y}`} className="absolute w-[20px] h-[4px] bg-pink-500/50 top-[8px]" style={{ left: x*20, top: y*20 + 8 }} />
                    );
                    // Dots
                    if (cell === 2) return (
                        <div key={`${x}-${y}`} className="absolute w-[20px] h-[20px] flex items-center justify-center" style={{ left: x*20, top: y*20 }}>
                            <div className="w-[4px] h-[4px] bg-yellow-200 rounded-full shadow-[0_0_4px_yellow]" />
                        </div>
                    );
                    // Power Pellets
                    if (cell === 3) return (
                        <div key={`${x}-${y}`} className="absolute w-[20px] h-[20px] flex items-center justify-center" style={{ left: x*20, top: y*20 }}>
                            <div className="w-[12px] h-[12px] bg-yellow-100 rounded-full animate-pulse shadow-[0_0_10px_orange]" />
                        </div>
                    );
                    return null;
                }))}

                {/* PACMAN */}
                <div 
                    className="absolute w-[20px] h-[20px] z-20 transition-transform duration-100 linear"
                    style={{ 
                        left: pacmanPos.x * 20, 
                        top: pacmanPos.y * 20,
                        transform: `rotate(${pacmanDir === "UP" ? -90 : pacmanDir === "DOWN" ? 90 : pacmanDir === "LEFT" ? 180 : 0}deg)`
                    }}
                >
                    <div className="w-full h-full relative animate-[chomp_0.3s_infinite]">
                        <div className="absolute inset-0 bg-yellow-400 rounded-full" style={{ clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%, 0% 100%, 0% 0%)' }} />
                        <div className="absolute inset-0 bg-yellow-400 rounded-full" />
                        <div className="absolute right-0 top-1/2 w-[10px] h-[10px] bg-black translate-y-[-50%] translate-x-[50%] rotate-45" /> 
                    </div>
                </div>

                {/* GHOSTS */}
                {ghosts.map(ghost => {
                    const isFrightened = ghost.mode === "FRIGHTENED";
                    const isEaten = ghost.mode === "EATEN";
                    const color = isFrightened ? "#3b82f6" : (isEaten ? "transparent" : ghost.color);
                    
                    return (
                        <div 
                            key={ghost.id}
                            className="absolute w-[20px] h-[20px] z-20 transition-all duration-150 linear"
                            style={{ left: ghost.x * 20, top: ghost.y * 20 }}
                        >
                            {!isEaten && (
                                <div className="w-full h-full rounded-t-full relative shadow-[0_0_10px_currentColor]" style={{ color: color, backgroundColor: color }}>
                                    <div className="absolute bottom-0 flex w-full h-[6px]">
                                        <div className="flex-1 bg-inherit rounded-b-full translate-y-[2px]" />
                                        <div className="flex-1 bg-inherit rounded-b-full translate-y-[2px]" />
                                        <div className="flex-1 bg-inherit rounded-b-full translate-y-[2px]" />
                                    </div>
                                </div>
                            )}
                            {/* Eyes */}
                            <div className="absolute top-[4px] left-0 w-full flex justify-center gap-[2px]">
                                <div className="w-[6px] h-[6px] bg-white rounded-full flex items-center justify-center">
                                    <div className={`w-[2px] h-[2px] bg-blue-900 rounded-full transition-transform ${ghost.dir === 'LEFT' ? '-translate-x-1' : ghost.dir === 'RIGHT' ? 'translate-x-1' : ''}`} />
                                </div>
                                <div className="w-[6px] h-[6px] bg-white rounded-full flex items-center justify-center">
                                    <div className={`w-[2px] h-[2px] bg-blue-900 rounded-full transition-transform ${ghost.dir === 'LEFT' ? '-translate-x-1' : ghost.dir === 'RIGHT' ? 'translate-x-1' : ''}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* OVERLAYS */}
                {gameState !== "PLAYING" && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            {gameState === "GAMEOVER" && <h2 className="text-5xl font-black text-red-600 mb-4 animate-bounce drop-shadow-[0_0_15px_red]">GAME OVER</h2>}
                            {gameState === "WON" && <h2 className="text-5xl font-black text-green-500 mb-4 animate-bounce drop-shadow-[0_0_15px_green]">VICTOIRE !</h2>}
                            {gameState === "IDLE" && (
                                 <div className="space-y-4">
                                    <h2 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">READY ?</h2>
                                    <p className="text-sm text-blue-300 animate-pulse">Appuie sur START pour jouer</p>
                                 </div>
                            )}
                            
                            <Button 
                                onClick={startGame} 
                                className="mt-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-8 py-6 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.6)] border-2 border-white/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {gameState === "PAUSED" ? "REPRENDRE" : "JOUER"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* MOBILE CONTROLS & FOOTER */}
      <div className="relative z-20 mt-8 w-full max-w-lg flex flex-col items-center gap-4">
        
        {/* Virtual D-Pad */}
        <div className="grid grid-cols-3 gap-2 sm:hidden bg-white/5 p-4 rounded-full border border-white/10 shadow-xl backdrop-blur-md">
            <div />
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 active:bg-yellow-500/50" onPointerDown={(e) => { e.preventDefault(); handleKeyDown("ArrowUp"); }}>
                <ChevronUp className="h-8 w-8" />
            </Button>
            <div />
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 active:bg-yellow-500/50" onPointerDown={(e) => { e.preventDefault(); handleKeyDown("ArrowLeft"); }}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-red-500/20 active:bg-red-500/50" onClick={() => setGameState(g => g === "PLAYING" ? "PAUSED" : "PLAYING")}>
                {gameState === "PLAYING" ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 active:bg-yellow-500/50" onPointerDown={(e) => { e.preventDefault(); handleKeyDown("ArrowRight"); }}>
                <ChevronRight className="h-8 w-8" />
            </Button>
            <div />
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 active:bg-yellow-500/50" onPointerDown={(e) => { e.preventDefault(); handleKeyDown("ArrowDown"); }}>
                <ChevronDown className="h-8 w-8" />
            </Button>
            <div />
        </div>

        {/* Desktop Controls Hint */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 bg-black/40 px-4 py-2 rounded-full border border-white/5">
            <span className="flex items-center gap-1"><Gamepad2 className="w-4 h-4" /> Contrôles: Flèches</span>
            <span className="w-px h-4 bg-gray-700"/>
            <span className="flex items-center gap-1"><span className="border border-gray-600 px-1 rounded text-[10px]">ESPACE</span> Pause</span>
        </div>
        
        <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="lg" 
                onClick={() => router.push("/dashboard")} 
                className="bg-neutral-800/80 border-2 border-red-500/50 text-white hover:bg-red-500/20 hover:border-red-500 transition-all font-semibold"
            >
                <RotateCcw className="mr-2 h-5 w-5" /> Quitter
            </Button>
        </div>
      </div>

    </div>
  );
}