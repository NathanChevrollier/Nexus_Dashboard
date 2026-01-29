"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Zap,
  Activity,
  Cpu,
  Terminal as TerminalIcon
} from "lucide-react";

// --- ANIMATIONS ---
export const springTransition = { type: "spring", stiffness: 300, damping: 30 };

// --- LAYOUT ---
export const GameLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#020202] text-slate-100 font-sans overflow-hidden flex flex-col md:flex-row relative selection:bg-cyan-500/30">
    {children}
  </div>
);

// --- NUMBER COUNTER ---
export const AnimatedNumber = ({ value, className = "", prefix = "" }: { value: number; className?: string; prefix?: string }) => {
  const format = (n: number) => {
    if (n < 1000) return n.toFixed(0);
    const suffixes = ["k", "M", "B", "T", "Qa", "Qi"];
    const suffixNum = Math.floor(("" + Math.floor(n)).length / 3);
    let shortValue = parseFloat((suffixNum !== 0 ? (n / Math.pow(1000, suffixNum)) : n).toPrecision(3));
    if (shortValue % 1 !== 0) shortValue = parseFloat(shortValue.toFixed(2));
    return shortValue + suffixes[suffixNum - 1];
  };

  return <span className={className}>{prefix}{format(value)}</span>;
};

// --- CENTRAL NODE (The Brain) ---
export const CentralNode = ({ 
  entropy, 
  ops, 
  isOvercharged, 
  overchargeProgress, 
  onClick 
}: { 
  entropy: number; 
  ops: number; 
  isOvercharged: boolean; 
  overchargeProgress: number; 
  onClick: (e: React.MouseEvent) => void 
}) => {
  const scale = useSpring(1, { stiffness: 300, damping: 15 });
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative p-8">
      {/* Background Glow */}
      <div className={cn("absolute inset-0 bg-cyan-900/5 blur-[120px] rounded-full transition-all duration-1000", isOvercharged ? "bg-amber-600/10" : "")} />

      {/* Stats Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="text-xs font-bold text-cyan-700 uppercase tracking-[0.5em] mb-2 flex items-center justify-center gap-2">
           <Activity className="w-3 h-3 animate-pulse" /> Flux Entropique
        </div>
        <div className={cn("text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl transition-colors font-mono tabular-nums", isOvercharged ? "text-amber-400" : "text-white")}>
          <AnimatedNumber value={entropy} />
        </div>
        <div className="flex justify-center gap-4 mt-6">
          <Badge variant="outline" className="bg-slate-950/50 border-cyan-800 text-cyan-400 px-4 py-1.5 text-sm font-mono backdrop-blur-md">
            <Zap className="w-3 h-3 mr-2" /> <AnimatedNumber value={ops} /> OPS
          </Badge>
        </div>
      </motion.div>

      {/* The Core */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 group cursor-pointer" onClick={(e) => {
        scale.set(0.9);
        setTimeout(() => scale.set(1), 50);
        onClick(e);
      }}>
        {/* Orbital Rings - Decorative */}
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute inset-[-20px] rounded-full border border-dashed border-cyan-800/30 pointer-events-none"
        />
        <motion.div 
           animate={{ rotate: -360 }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute inset-[-40px] rounded-full border border-dotted border-cyan-800/20 pointer-events-none"
        />

        {/* Overcharge Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          <motion.circle 
            cx="50%" cy="50%" r="48%" fill="none" 
            stroke={isOvercharged ? "#fbbf24" : "#06b6d4"} 
            strokeWidth="4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: overchargeProgress / 100 }}
            transition={{ type: "spring", stiffness: 50 }}
            strokeLinecap="round"
            className="transition-colors duration-500"
          />
        </svg>

        {/* The Button */}
        <motion.div 
           style={{ scale }}
           className={cn(
            "absolute inset-4 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-300 z-20 backdrop-blur-sm border-2",
             isOvercharged 
               ? "bg-amber-950/40 border-amber-500/50 shadow-[0_0_80px_rgba(245,158,11,0.3)]" 
               : "bg-slate-950/40 border-cyan-500/30 shadow-[0_0_60px_rgba(8,145,178,0.2)] hover:border-cyan-400/80 hover:bg-cyan-950/30"
           )}
        >
          <div className="relative z-10 p-6 rounded-full bg-black/20">
             {isOvercharged ? (
                <Cpu className="w-20 h-20 text-amber-200 animate-[pulse_0.5s_ease-in-out_infinite]" />
             ) : (
                <BrainCircuit className="w-20 h-20 text-cyan-200 group-hover:text-white transition-colors" />
             )}
          </div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-cyan-200 transition-colors">
            {isOvercharged ? "SURCHARGE" : "EXECUTE"}
          </div>
        </motion.div>
      </div>

      {isOvercharged && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="mt-8 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 text-xs font-bold tracking-widest animate-pulse"
        >
          ⚠️ OVERCHARGE ACTIVE (x2 OPS / x5 CLICK) ⚠️
        </motion.div>
      )}
    </div>
  );
};

// --- LISTS & CARDS ---
export const ItemCard = ({ 
  name, 
  count, 
  cost, 
  production, 
  canAfford, 
  onClick, 
  icon: Icon,
  synergyActive 
}: any) => {
  return (
    <motion.button
      layout
      whileHover={canAfford ? { scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" } : {}}
      whileTap={canAfford ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group",
        canAfford 
          ? "bg-slate-900/40 border-white/5 hover:border-cyan-500/30" 
          : "bg-slate-900/20 border-white/5 opacity-60 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center border shadow-inner transition-colors",
        canAfford ? "bg-slate-800 border-white/10 text-cyan-400" : "bg-slate-900 border-white/5 text-slate-600"
      )}>
        <Icon className="w-6 h-6" />
      </div>

      <div className="flex-1 min-w-0">
         <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-200 truncate pr-2 group-hover:text-cyan-100 transition-colors">{name}</h4>
         </div>
         <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-slate-950 border-slate-800 text-slate-400 text-[10px] h-5 tabular-nums">
               Lvl {count}
            </Badge>
            <div className="text-xs text-emerald-400 font-mono flex items-center">
               <Zap className="w-3 h-3 mr-1" />
               <AnimatedNumber value={production} />/s
            </div>
         </div>
      </div>

      <div className="text-right">
         <div className={cn("text-sm font-bold font-mono tabular-nums", canAfford ? "text-white" : "text-slate-500")}>
            <AnimatedNumber value={cost} />
         </div>
         <div className="text-[10px] text-slate-500 uppercase tracking-wider">Entropy</div>
      </div>

      {synergyActive && (
         <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" title="Synergy Active" />
      )}
    </motion.button>
  );
};

// --- FIREWALL TERMINAL ---
export const FirewallTerminal = ({ firewall, onAction, onDisconnect }: any) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [firewall.log]);

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-violet-500/20 rounded-xl overflow-hidden font-mono text-sm shadow-2xl relative">
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20" />
      
      {/* Header */}
      <div className="bg-slate-900/80 p-3 border-b border-white/10 flex items-center justify-between backdrop-blur-md">
         <div className="flex items-center gap-2 text-violet-300">
            <TerminalIcon className="w-4 h-4" />
            <span className="font-bold tracking-wider text-xs">FIREWALL_BREACH_PROTOCOL_V2</span>
         </div>
         <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-violet-900/20 border-violet-500/30 text-violet-200">LVL {firewall.level}</Badge>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", firewall.inRun ? "bg-emerald-500" : "bg-red-500")} />
         </div>
      </div>

      {/* Visu Data */}
      <div className="p-4 grid grid-cols-3 gap-4 bg-slate-900/40 border-b border-white/5">
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500 uppercase">Target Integrity</div>
          <Progress value={(firewall.firewallHp / firewall.firewallHpMax) * 100} className="h-1.5 bg-slate-800" indicatorClassName="bg-red-500" />
          <div className="text-right text-xs text-red-400">{firewall.firewallHp} HP</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500 uppercase">System Stability</div>
          <Progress value={(firewall.integrity / firewall.integrityMax) * 100} className="h-1.5 bg-slate-800" indicatorClassName="bg-emerald-500" />
          <div className="text-right text-xs text-emerald-400">{firewall.integrity}%</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500 uppercase">Trace Level</div>
          <Progress value={(firewall.trace / firewall.traceMax) * 100} className="h-1.5 bg-slate-800" indicatorClassName={cn("bg-amber-500", firewall.trace > 80 && "animate-pulse")} />
          <div className="text-right text-xs text-amber-400">{Math.floor(firewall.trace)}%</div>
        </div>
      </div>

      {/* Logs */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 text-xs text-slate-300 bg-black/40">
        {firewall.log.length === 0 && <div className="opacity-50 italic">Waiting for connection...</div>}
        {firewall.log.map((line: string, i: number) => (
             <div key={i} className="flex gap-2">
                <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                <span className={cn(line.includes("VICTOIRE") ? "text-emerald-400 font-bold" : line.includes("ECHEC") ? "text-red-400 font-bold" : "")}>{line}</span>
             </div>
        ))}
        {/* Placeholder for scroll anchor */}
        <div className="h-2" />
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-900/60 border-t border-white/10 grid grid-cols-4 gap-2">
        <Button 
           variant="destructive" 
           disabled={!firewall.inRun || !!firewall.cooldowns.attack} 
           onClick={() => onAction('attack')}
           className="relative overflow-hidden font-bold"
        >
           {!!firewall.cooldowns.attack && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] z-10">CD</div>}
           ATTACK
        </Button>
        <Button 
           disabled={!firewall.inRun || !!firewall.cooldowns.exploit} 
           onClick={() => onAction('exploit')}
           className="bg-fuchsia-700 hover:bg-fuchsia-600 relative overflow-hidden font-bold"
        >
           {!!firewall.cooldowns.exploit && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] z-10">CD</div>}
           EXPLOIT
        </Button>
        <Button 
           disabled={!firewall.inRun || !!firewall.cooldowns.stabilize} 
           onClick={() => onAction('stabilize')}
           className="bg-emerald-700 hover:bg-emerald-600 relative overflow-hidden font-bold"
        >
           {!!firewall.cooldowns.stabilize && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] z-10">CD</div>}
           STABILIZE
        </Button>
        <Button variant="outline" onClick={onDisconnect} className="border-white/10 hover:bg-white/5 text-slate-400">
           ABORT
        </Button>
      </div>
    </div>
  );
};
