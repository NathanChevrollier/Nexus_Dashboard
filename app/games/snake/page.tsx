"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Home, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// --- TYPES ---
type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

// --- CONFIGURATION ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 140; // Vitesse de jeu (logique)
const SPEED_INCREMENT = 2; // Accélération par fruit
const MIN_SPEED = 60;

export default function SnakeCanvas() {
  const router = useRouter();
  const { data: session } = useSession();

  // --- STATE ---
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER">("IDLE");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);

  // --- REFS (MOTEUR) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // État du jeu (Mutable pour éviter les re-renders React)
  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }], // Position actuelle
    prevSnake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }], // Position précédente (pour interpolation)
    food: { x: 15, y: 5 },
    direction: "UP" as Direction,
    nextDirection: "UP" as Direction, // Buffer d'input
    lastTick: 0,
    speed: INITIAL_SPEED,
    particles: [] as Particle[],
    score: 0
  });

    const requestRef = useRef<number | null>(null);

  // --- INITIALISATION ---
  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=snake&userOnly=true");
        if (res.ok) {
           const data = await res.json();
           if (data?.score) setHighScore(data.score);
        }
      } catch (e) { console.error(e); }
    };
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("/api/games/scores?gameId=snake&limit=5");
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) setLeaderboard(data);
                }
            } catch (e) { console.error(e); }
        };
        fetchBestScore();
        fetchLeaderboard();
  }, []);

  // --- LOGIQUE DU JEU ---
  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.2;
      gameRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color
      });
    }
  };

  const updateLogic = () => {
    const state = gameRef.current;
    
    // 1. Mise à jour de la direction
    state.direction = state.nextDirection;

    // 2. Sauvegarde de l'état précédent pour l'interpolation
    // On doit copier profondément les objets pour ne pas garder la référence
    state.prevSnake = state.snake.map(p => ({ ...p }));

    // 3. Calcul de la nouvelle tête
    const head = { ...state.snake[0] };
    switch (state.direction) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    // 4. Collisions (Mur ou Soi-même)
    // Note: On vérifie collision murale stricte.
    // Pour soi-même, on ignore le dernier segment car il va bouger.
    if (
        head.x < 0 || head.x >= GRID_SIZE || 
        head.y < 0 || head.y >= GRID_SIZE ||
        state.snake.some((s, i) => i !== state.snake.length - 1 && s.x === head.x && s.y === head.y)
    ) {
        handleGameOver();
        return;
    }

    // 5. Mouvement
    // On ajoute la nouvelle tête au début
    state.snake.unshift(head);

    // 6. Manger
    if (head.x === state.food.x && head.y === state.food.y) {
        // Score
        state.score += 10;
        setScore(state.score);
        
        // Particules
        spawnParticles(head.x, head.y, "#ef4444"); // Rouge fruit

        // Accélération
        state.speed = Math.max(MIN_SPEED, state.speed - SPEED_INCREMENT);

        // Nouvelle nourriture
        let newFood: Point;
        let isOnSnake: boolean;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            // eslint-disable-next-line no-loop-func
            isOnSnake = state.snake.some(s => s.x === newFood.x && s.y === newFood.y);
        } while (isOnSnake);
        state.food = newFood;
        
        // On ne retire PAS la queue, donc le serpent grandit
    } else {
        // On retire la queue pour garder la même taille
        state.snake.pop();
    }
  };

  const handleGameOver = async () => {
    setGameState("GAMEOVER");
    const finalScore = gameRef.current.score;
    
    if (finalScore > highScore) setHighScore(finalScore);

    if (finalScore > 0 && session?.user) {
        try {
            await fetch("/api/games/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    gameId: "snake", 
                    score: finalScore, 
                    metadata: { length: gameRef.current.snake.length } 
                }),
            });
        } catch(e) { console.error(e); }
    }
  };

  // --- BOUCLE DE RENDU (CANVAS) ---
  const render = (time: number) => {
    if (gameState !== "PLAYING") return;

    const state = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Gestion du temps logique (Update fixe)
    if (time - state.lastTick > state.speed) {
        updateLogic();
        state.lastTick = time;
    }
    
    // Calcul de l'interpolation (0.0 à 1.0)
    // Cela détermine où nous sommes ENTRE deux cases de la grille
    const progress = Math.min((time - state.lastTick) / state.speed, 1.0);

    // --- DESSIN ---
    
    // 1. Nettoyage
    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / GRID_SIZE;
    ctx.clearRect(0, 0, width, height);

    // 2. Grille Subtile (Background)
    ctx.strokeStyle = "rgba(34, 197, 94, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, height);
        ctx.moveTo(0, i * cellSize); ctx.lineTo(width, i * cellSize);
    }
    ctx.stroke();

    // 3. Food (Avec effet Pulse)
    const foodX = state.food.x * cellSize + cellSize / 2;
    const foodY = state.food.y * cellSize + cellSize / 2;
    const pulse = Math.sin(time / 200) * 2;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(foodX, foodY, (cellSize / 3) + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset

    // 4. Serpent (Corps fluide)
    if (state.snake.length > 0) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = cellSize * 0.8; // Serpent épais
        
        // Dégradé néon
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#4ade80");
        gradient.addColorStop(1, "#16a34a");
        ctx.strokeStyle = gradient;
        
        // Glow effect
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 20;

        ctx.beginPath();
        
        // Dessin des segments interpolés
        state.snake.forEach((segment, i) => {
            // Trouver la position précédente correspondante
            // Si le serpent vient de grandir, le dernier segment n'a pas de "prev" correspondant unique
            // Mais logic update gère ça.
            
            // Pour le segment i, sa position précédente est prevSnake[i]
            // Si i >= prevSnake.length (nouveau segment), on prend prevSnake[last]
            const prev = state.prevSnake[i] || state.prevSnake[state.prevSnake.length - 1];

            const currentX = prev.x + (segment.x - prev.x) * progress;
            const currentY = prev.y + (segment.y - prev.y) * progress;

            const drawX = currentX * cellSize + cellSize / 2;
            const drawY = currentY * cellSize + cellSize / 2;

            if (i === 0) {
                ctx.moveTo(drawX, drawY);
                
                // Dessin des yeux (Détail extra)
                // On calcule la position des yeux basés sur la direction interpolée
                // C'est un peu complexe en canvas pur pour un code court, on laisse le style simple "Tube"
            } else {
                ctx.lineTo(drawX, drawY);
            }
        });
        ctx.stroke();
        
        // Yeux sur la tête (calculée à part pour être au dessus)
        const headPrev = state.prevSnake[0];
        const headCurr = state.snake[0];
        const headX = (headPrev.x + (headCurr.x - headPrev.x) * progress) * cellSize + cellSize/2;
        const headY = (headPrev.y + (headCurr.y - headPrev.y) * progress) * cellSize + cellSize/2;
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(headX, headY, cellSize * 0.2, 0, Math.PI * 2); // Oeil simple
        ctx.fill();
    }

    // 5. Particules
    state.particles = state.particles.filter(p => p.life > 0);
    state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life = Math.max(0, p.life - 0.02);
        if (p.life <= 0) return; // Skip if fully faded to avoid negative radius
        
        const px = p.x * cellSize + cellSize/2; // Offset par rapport à la grille
        const py = p.y * cellSize + cellSize/2;
        const life = p.life;
        const radius = Math.max(0.0001, cellSize * 0.15 * life);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = life;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    requestRef.current = requestAnimationFrame(render);
  };

  // --- CONTROLS ---
  const handleInput = useCallback((newDir: Direction) => {
    if (gameState === "IDLE") startGame();
    
    const currentDir = gameRef.current.direction;
    const opposites = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    
    // Empêcher le demi-tour immédiat
    if (opposites[newDir] !== currentDir) {
        // Empêcher le spam de touches (max 1 changement par tick est géré par la logique,
        // mais on update nextDirection. Si on appuie 2 fois vite, seule la dernière compte ici.
        // Pour être parfait il faudrait une queue, mais c'est suffisant pour la fluidité Canvas)
        gameRef.current.nextDirection = newDir;
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
        
        if (e.key === " " && (gameState === "PLAYING" || gameState === "PAUSED")) {
            setGameState(prev => prev === "PLAYING" ? "PAUSED" : "PLAYING");
            return;
        }

        switch(e.key) {
            case "ArrowUp": handleInput("UP"); break;
            case "ArrowDown": handleInput("DOWN"); break;
            case "ArrowLeft": handleInput("LEFT"); break;
            case "ArrowRight": handleInput("RIGHT"); break;
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput, gameState]);

  // --- LIFECYCLE ---
  useEffect(() => {
    if (gameState === "PLAYING") {
        gameRef.current.lastTick = performance.now();
        requestRef.current = requestAnimationFrame(render);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Resize Canvas High DPI
  useEffect(() => {
      const canvas = canvasRef.current;
      if(canvas) {
          const size = Math.min(window.innerWidth - 40, 600); // Max 600px
          // Pour High DPI screens
          const dpr = window.devicePixelRatio || 1;
          canvas.width = size * dpr;
          canvas.height = size * dpr;
          canvas.style.width = `${size}px`;
          canvas.style.height = `${size}px`;
          const ctx = canvas.getContext('2d');
          if(ctx) ctx.scale(dpr, dpr);
      }
  }, []);

  const startGame = () => {
    gameRef.current = {
        snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
        prevSnake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
        food: { x: 15, y: 5 },
        direction: "UP",
        nextDirection: "UP",
        lastTick: performance.now(),
        speed: INITIAL_SPEED,
        particles: [],
        score: 0
    };
    setScore(0);
    setGameState("PLAYING");
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 font-mono select-none overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-[#020617] to-[#020617] pointer-events-none" />

      {/* HEADER */}
      <div className="z-10 w-full max-w-[600px] flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
         <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
            NEON SNAKE <span className="text-xs not-italic text-slate-500 font-normal ml-2">CANVAS</span>
         </h1>
         <div className="flex gap-4 text-white">
            <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Score</p>
                <p className="text-xl font-bold font-mono text-white">{score}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Best</p>
                <p className="text-xl font-bold font-mono text-yellow-500">{Math.max(score, highScore)}</p>
            </div>
         </div>
      </div>

      <div className="w-full max-w-[600px] mb-4">
        <div className="bg-slate-800/90 border-2 border-green-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
            <h3 className="text-base font-bold flex items-center gap-2 text-white mb-4">
                <Trophy className="w-5 h-5 text-yellow-400" /> Classement
            </h3>
            {leaderboard.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun score enregistré</p>
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
                                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                    index < 3 ? "bg-green-500/20 border-2 border-green-500/50 shadow-lg" : "bg-slate-700/80 border border-slate-600/50"
                                )}
                            >
                                <div className="w-8 text-center text-xl">{medal}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate text-white">{name}</p>
                                </div>
                                <div className="text-base font-mono font-bold text-green-400">{score.toLocaleString()}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* GAME CANVAS WRAPPER */}
      <div className="relative rounded-2xl border border-slate-800 bg-black overflow-hidden">
        <canvas 
            ref={canvasRef}
            className="block"
            // Width/Height set by JS for High DPI
        />

        {/* OVERLAYS (UI HTML au-dessus du Canvas) */}
        {gameState !== "PLAYING" && (
            <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center flex-col gap-6 animate-in fade-in duration-300">
                {gameState === "GAMEOVER" && (
                    <div className="text-center animate-bounce">
                        <h2 className="text-5xl font-black text-red-600 drop-shadow-[0_0_25px_red]">GAME OVER</h2>
                        <p className="text-slate-300 mt-2">Score Final: {score}</p>
                    </div>
                )}
                {gameState === "PAUSED" && <h2 className="text-5xl font-bold text-white animate-pulse tracking-widest">PAUSE</h2>}
                {gameState === "IDLE" && (
                     <div className="text-center space-y-2 animate-pulse">
                        <div className="text-5xl font-black text-green-500 drop-shadow-[0_0_20px_#22c55e]">READY?</div>
                        <p className="text-xs text-slate-500">Appuyez pour commencer</p>
                     </div>
                )}
                
                <Button 
                    onClick={startGame} 
                    className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-transform hover:scale-105 active:scale-95"
                >
                    {gameState === "PAUSED" ? "REPRENDRE" : "JOUER"}
                </Button>
            </div>
        )}
      </div>

      {/* MOBILE CONTROLS */}
      <div className="mt-8 grid grid-cols-3 gap-3 sm:hidden">
            <div />
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-2xl bg-slate-800/50 text-white" onPointerDown={(e) => { e.preventDefault(); handleInput("UP"); }}>
                <ChevronUp className="h-8 w-8" />
            </Button>
            <div />
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-2xl bg-slate-800/50 text-white" onPointerDown={(e) => { e.preventDefault(); handleInput("LEFT"); }}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button variant="destructive" size="icon" className="h-14 w-14 rounded-2xl opacity-80" onClick={() => setGameState(g => g === "PLAYING" ? "PAUSED" : "PLAYING")}>
                {gameState === "PLAYING" ? <Pause /> : <Play />}
            </Button>
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-2xl bg-slate-800/50 text-white" onPointerDown={(e) => { e.preventDefault(); handleInput("RIGHT"); }}>
                <ChevronRight className="h-8 w-8" />
            </Button>
            <div />
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-2xl bg-slate-800/50 text-white" onPointerDown={(e) => { e.preventDefault(); handleInput("DOWN"); }}>
                <ChevronDown className="h-8 w-8" />
            </Button>
            <div />
      </div>

      <div className="mt-12 flex gap-4 relative z-30">
         <Button 
            variant="outline" 
            size="lg" 
            onClick={() => router.push("/dashboard")} 
            className="bg-slate-800/80 border-2 border-red-500/50 text-white hover:bg-red-500/20 hover:border-red-500 transition-all font-semibold"
         >
            <Home className="mr-2 h-5 w-5" /> Quitter
        </Button>
      </div>

    </div>
  );
}