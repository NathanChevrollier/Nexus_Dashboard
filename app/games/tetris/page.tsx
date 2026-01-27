"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Home, Trophy, ArrowDownToLine, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// --- TYPES ---
type Board = (string | null)[][];
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Piece = {
  type: PieceType;
  matrix: number[][];
  x: number;
  y: number;
  color: string;
};

// --- CONFIG ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Taille de base, ajustée responsivement
const LOCK_DELAY = 500; // Temps avant qu'une pièce se bloque au sol

const PIECES: Record<PieceType, { shape: number[][], color: string }> = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: '#00f0f0' }, // Cyan
  O: { shape: [[1,1], [1,1]], color: '#f0f000' }, // Yellow
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], color: '#a000f0' }, // Purple
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], color: '#00f000' }, // Green
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], color: '#f00000' }, // Red
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], color: '#0000f0' }, // Blue
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], color: '#f0a000' }, // Orange
};

export default function TetrisCanvas() {
  const router = useRouter();
  const { data: session } = useSession();

  // --- STATE ---
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER">("IDLE");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
    const [highScore, setHighScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  
  // --- REFS (ENGINE) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const gameRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) as Board,
    piece: null as Piece | null,
    nextPiece: null as Piece | null,
    holdPiece: null as Piece | null,
    canHold: true,
    dropCounter: 0,
    dropInterval: 800,
    lastTime: 0,
    score: 0,
    lines: 0,
    level: 1,
    particles: [] as {x: number, y: number, vx: number, vy: number, color: string, life: number}[]
  });

    const requestRef = useRef<number | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
        const fetchBestScore = async () => {
      try {
        const res = await fetch("/api/games/scores?gameId=tetris&userOnly=true");
        if (res.ok) {
           const data = await res.json();
           if (data?.score) setHighScore(data.score);
        }
      } catch (e) { console.error(e); }
    };
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("/api/games/scores?gameId=tetris&limit=5");
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) setLeaderboard(data);
                }
            } catch (e) { console.error(e); }
        };
        fetchBestScore();
        fetchLeaderboard();
  }, []);

  // --- ENGINE LOGIC ---

  const createPiece = (type: PieceType): Piece => ({
      type,
      matrix: PIECES[type].shape,
      x: Math.floor((COLS - PIECES[type].shape[0].length) / 2),
      y: 0,
      color: PIECES[type].color
  });

  const getRandomPiece = () => {
      const types = "IJLOSTZ";
      return createPiece(types[Math.floor(Math.random() * types.length)] as PieceType);
  };

  const collide = (board: Board, piece: Piece) => {
      const m = piece.matrix;
      for (let y = 0; y < m.length; ++y) {
          for (let x = 0; x < m[y].length; ++x) {
              if (m[y][x] !== 0 && (board[y + piece.y] && board[y + piece.y][x + piece.x]) !== null) {
                  return true;
              }
          }
      }
      return false;
  };

  const merge = (board: Board, piece: Piece) => {
      piece.matrix.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  // Check boundaries to prevent crash if piece is partially out (game over scenario)
                  if(board[y + piece.y] && board[y + piece.y][x + piece.x] !== undefined) {
                      board[y + piece.y][x + piece.x] = piece.color;
                  }
              }
          });
      });
  };

  const rotate = (matrix: number[][]) => {
      const N = matrix.length;
      const result = matrix.map((row, i) =>
          row.map((val, j) => matrix[N - 1 - j][i])
      );
      return result;
  };

  const playerRotate = (dir: 1 | -1) => {
      const state = gameRef.current;
      if (!state.piece) return;

      const pos = state.piece.x;
      let offset = 1;
      const originalMatrix = state.piece.matrix;
      state.piece.matrix = rotate(state.piece.matrix);
      
      // Wall Kick (Basic)
      while (collide(state.board, state.piece)) {
          state.piece.x += offset;
          offset = -(offset + (offset > 0 ? 1 : -1));
          if (offset > state.piece.matrix[0].length) {
              // Rotation impossible, revert
              state.piece.matrix = originalMatrix;
              state.piece.x = pos;
              return;
          }
      }
  };

  const arenaSweep = () => {
      const state = gameRef.current;
      let rowCount = 0;
      
      outer: for (let y = state.board.length - 1; y > 0; --y) {
          for (let x = 0; x < state.board[y].length; ++x) {
              if (state.board[y][x] === null) {
                  continue outer;
              }
          }

          const row = state.board.splice(y, 1)[0].fill(null);
          state.board.unshift(row);
          ++y;
          rowCount++;

          // Particles effect for cleared line
          for(let i=0; i<20; i++) {
              state.particles.push({
                  x: Math.random() * COLS * BLOCK_SIZE,
                  y: y * BLOCK_SIZE,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  color: '#fff',
                  life: 1.0
              });
          }
      }

      if (rowCount > 0) {
          const points = [0, 40, 100, 300, 1200];
          state.score += points[rowCount] * state.level;
          state.lines += rowCount;
          state.level = Math.floor(state.lines / 10) + 1;
          state.dropInterval = Math.max(80, 900 - (state.level - 1) * 120); // Faster baseline
          
          setScore(state.score);
          setLines(state.lines);
          setLevel(state.level);
      }
  };

  const playerDrop = () => {
      const state = gameRef.current;
      if (!state.piece) return;
      
      state.piece.y++;
      if (collide(state.board, state.piece)) {
          state.piece.y--;
          merge(state.board, state.piece);
          playerReset();
          arenaSweep();
      }
      state.dropCounter = 0;
  };

  const playerReset = () => {
      const state = gameRef.current;
      state.piece = state.nextPiece || getRandomPiece();
      state.nextPiece = getRandomPiece();
      state.canHold = true;

      if (collide(state.board, state.piece)) {
          setGameState("GAMEOVER");
          handleGameOver();
      }
  };

  const handleGameOver = async () => {
      const state = gameRef.current;
      if(state.score > highScore) setHighScore(state.score);
      
      if (state.score > 0 && session?.user) {
          try {
              await fetch("/api/games/scores", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                      gameId: "tetris", 
                      score: state.score, 
                      metadata: { level: state.level, lines: state.lines } 
                  }),
              });
              // Refresh leaderboard after saving score
              const res = await fetch("/api/games/scores?gameId=tetris&limit=5");
              if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data)) setLeaderboard(data);
              }
          } catch(e) { console.error(e); }
      }
  };

  const playerHold = () => {
      const state = gameRef.current;
      if (!state.canHold || !state.piece) return;

      if (!state.holdPiece) {
          state.holdPiece = createPiece(state.piece.type);
          playerReset();
      } else {
          const temp = createPiece(state.piece.type);
          state.piece = createPiece(state.holdPiece.type);
          state.holdPiece = temp;
      }
      state.canHold = false;
  };

  // --- RENDER ---
  const drawMatrix = (ctx: CanvasRenderingContext2D, matrix: (string|null|number)[][], offset: {x: number, y: number}, color?: string, ghost = false) => {
      matrix.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0 && value !== null) {
                  ctx.fillStyle = ghost ? 'rgba(255, 255, 255, 0.1)' : (color || (value as string));
                  ctx.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                  
                  // Detail
                  if(!ghost) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Shine
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, 5);
                  }
              }
          });
      });
  };

  const render = (time: number) => {
      if(gameState !== "PLAYING") return;
      
      const state = gameRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const deltaTime = time - state.lastTime;
      state.lastTime = time;

      state.dropCounter += deltaTime;
      if (state.dropCounter > state.dropInterval) {
          playerDrop();
      }

      // Draw Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      for(let x=0; x<COLS; x++) { ctx.beginPath(); ctx.moveTo(x*BLOCK_SIZE,0); ctx.lineTo(x*BLOCK_SIZE,canvas.height); ctx.stroke(); }
      for(let y=0; y<ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*BLOCK_SIZE); ctx.lineTo(canvas.width,y*BLOCK_SIZE); ctx.stroke(); }

      // Draw Board
      drawMatrix(ctx, state.board, {x: 0, y: 0});

      // Draw Ghost Piece
      if (state.piece) {
          const ghost = { ...state.piece };
          while (!collide(state.board, ghost)) {
              ghost.y++;
          }
          ghost.y--;
          drawMatrix(ctx, ghost.matrix, {x: ghost.x, y: ghost.y}, undefined, true);
      
          // Draw Active Piece
          drawMatrix(ctx, state.piece.matrix, {x: state.piece.x, y: state.piece.y}, state.piece.color);
      }

      // Particles
      state.particles = state.particles.filter(p => p.life > 0);
      state.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05;
          ctx.fillStyle = `rgba(255,255,255,${p.life})`;
          ctx.fillRect(p.x, p.y, 4, 4);
      });

      // Aux Canvas (Next & Hold)
      renderAux(nextCanvasRef.current, state.nextPiece);
      renderAux(holdCanvasRef.current, state.holdPiece);

      requestRef.current = requestAnimationFrame(render);
  };

  const renderAux = (cvs: HTMLCanvasElement | null, piece: Piece | null) => {
      if(!cvs) return;
      const ctx = cvs.getContext('2d');
      if(!ctx) return;
      ctx.fillStyle = '#111';
      ctx.fillRect(0,0,cvs.width,cvs.height);
      if(piece) {
          // Center piece
          const offsetX = (4 - piece.matrix[0].length) / 2;
          const offsetY = (4 - piece.matrix.length) / 2;
          drawMatrix(ctx, piece.matrix, {x: offsetX, y: offsetY}, piece.color);
      }
  };

  // --- CONTROLS ---
  const handleInput = useCallback((key: string) => {
      if(gameState === "IDLE") startGame();
      const state = gameRef.current;
      if(gameState !== "PLAYING" || !state.piece) return;

      switch(key) {
          case 'ArrowLeft': 
              state.piece.x--;
              if (collide(state.board, state.piece)) state.piece.x++;
              break;
          case 'ArrowRight':
              state.piece.x++;
              if (collide(state.board, state.piece)) state.piece.x--;
              break;
          case 'ArrowDown':
              playerDrop();
              break;
          case 'ArrowUp':
          case 'x':
              playerRotate(1);
              break;
          case 'Space': // Hard Drop
              while(!collide(state.board, state.piece)) {
                  state.piece.y++;
              }
              state.piece.y--;
              merge(state.board, state.piece);
              playerReset();
              arenaSweep();
              state.dropCounter = 0;
              break;
          case 'c': // Hold
          case 'Shift':
              playerHold();
              break;
      }
  }, [gameState]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
          if(e.key === " " && (gameState === "PLAYING")) handleInput('Space');
          else if(e.key === "Escape") setGameState(prev => prev === "PLAYING" ? "PAUSED" : "PLAYING");
          else handleInput(e.key);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput, gameState]);

  useEffect(() => {
      if (gameState === "PLAYING") {
          gameRef.current.lastTime = performance.now();
          requestRef.current = requestAnimationFrame(render);
      } else {
          cancelAnimationFrame(requestRef.current!);
      }
      return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState]);

  const startGame = () => {
      gameRef.current = {
          board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
          piece: null,
          nextPiece: getRandomPiece(),
          holdPiece: null,
          canHold: true,
          dropCounter: 0,
          dropInterval: 800,
          lastTime: performance.now(),
          score: 0,
          lines: 0,
          level: 1,
          particles: []
      };
      playerReset();
      setScore(0);
      setLines(0);
      setLevel(1);
      setGameState("PLAYING");
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 font-mono select-none overflow-hidden text-white">
      
      {/* HEADER */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-blue-500/20 backdrop-blur-md">
         <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
            TETRIS <span className="text-xs not-italic text-slate-500 font-normal ml-2">CANVAS</span>
         </h1>
         <div className="flex gap-6">
            <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">Score</p>
                <p className="text-xl font-bold font-mono">{score}</p>
            </div>
            <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">Lines</p>
                <p className="text-xl font-bold font-mono text-green-400">{lines}</p>
            </div>
            <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">Level</p>
                <p className="text-xl font-bold font-mono text-yellow-400">{level}</p>
            </div>
            <div className="text-center hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase">Best</p>
                <p className="text-xl font-bold font-mono text-blue-300">{Math.max(score, highScore)}</p>
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT PANEL (HOLD) */}
          <div className="hidden lg:flex flex-col gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Hold (C)</p>
                  <canvas ref={holdCanvasRef} width={BLOCK_SIZE*4} height={BLOCK_SIZE*4} className="bg-black rounded border border-slate-700 w-[120px] h-[120px]" />
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p>⬅️ ➡️ Move</p>
                  <p>⬆️ Rotate</p>
                  <p>⬇️ Soft Drop</p>
                  <p>SPACE Hard Drop</p>
              </div>
          </div>

          {/* MAIN BOARD */}
          <div className="relative border-[4px] border-slate-800 bg-black rounded shadow-[0_0_50px_rgba(59,130,246,0.15)]">
               <canvas 
                  ref={canvasRef} 
                  width={COLS * BLOCK_SIZE} 
                  height={ROWS * BLOCK_SIZE} 
                  className="block"
               />
               
               {/* OVERLAYS */}
               {gameState !== "PLAYING" && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-6 animate-in fade-in z-20">
                        {gameState === "GAMEOVER" && (
                            <div className="text-center animate-bounce">
                                <h2 className="text-5xl font-black text-red-600">GAME OVER</h2>
                                <p className="text-slate-300 mt-2">Score: {score}</p>
                            </div>
                        )}
                        {gameState === "PAUSED" && <h2 className="text-4xl font-bold text-white animate-pulse">PAUSE</h2>}
                        {gameState === "IDLE" && <h2 className="text-5xl font-black text-blue-500">READY?</h2>}
                        
                        <Button 
                            onClick={startGame} 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-6 rounded-full"
                        >
                            {gameState === "PAUSED" ? "RESUME" : "PLAY"}
                        </Button>
                    </div>
               )}
          </div>

          {/* RIGHT PANEL (NEXT) */}
          <div className="flex flex-col gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Next</p>
                  <canvas ref={nextCanvasRef} width={BLOCK_SIZE*4} height={BLOCK_SIZE*4} className="bg-black rounded border border-slate-700 w-[120px] h-[120px]" />
              </div>

                            <div className="bg-slate-800/90 p-4 rounded-lg border-2 border-blue-500/30 w-[220px] shadow-xl backdrop-blur-sm">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-white mb-3">
                                        <Trophy className="w-4 h-4 text-yellow-400" /> Classement
                                    </h3>
                                    {leaderboard.length === 0 ? (
                                        <p className="text-sm text-slate-400">Aucun score enregistré</p>
                                    ) : (
                                        <div className="space-y-2 text-sm">
                                            {leaderboard.map((entry, index) => {
                                                const name = (entry as any).userName || (entry as any).name || 'Anonyme';
                                                const score = (entry as any).score ?? (entry as any).bestScore ?? 0;
                                                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`;
                                                return (
                                                    <div
                                                        key={(entry as any).userId || name + index}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg",
                                                            index < 3 ? "bg-blue-500/10 border border-blue-500/30" : "bg-slate-800/60 border border-slate-800"
                                                        )}
                                                    >
                                                        <div className="w-8 text-center text-lg">{medal}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{name}</p>
                                                        </div>
                                                        <div className="text-sm font-mono text-blue-300">{score.toLocaleString()}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                            </div>
              
              {/* MOBILE CONTROLS (VISIBLE ONLY ON SMALL SCREENS) */}
              <div className="lg:hidden grid grid-cols-3 gap-2 mt-4">
                 <div/>
                 <Button size="icon" variant="secondary" onPointerDown={() => handleInput('ArrowUp')}><RotateCw/></Button>
                 <div/>
                 <Button size="icon" variant="secondary" onPointerDown={() => handleInput('ArrowLeft')}><ChevronLeft/></Button>
                 <Button size="icon" variant="secondary" onPointerDown={() => handleInput('ArrowDown')}><ChevronDown/></Button>
                 <Button size="icon" variant="secondary" onPointerDown={() => handleInput('ArrowRight')}><ChevronRight/></Button>
                 <Button size="icon" variant="secondary" className="col-span-3 mt-2 bg-blue-900/50" onPointerDown={() => handleInput('Space')}><ArrowDownToLine/></Button>
              </div>
          </div>

      </div>

      <div className="mt-8">
         <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")} className="bg-slate-800/80 border-2 border-red-500/50 text-white hover:bg-red-500/20 hover:border-red-500 transition-all font-semibold">
            <Home className="mr-2 h-5 w-5" /> Quitter
        </Button>
      </div>

    </div>
  );
}