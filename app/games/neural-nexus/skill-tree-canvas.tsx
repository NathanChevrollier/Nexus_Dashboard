"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { type SkillNode } from './content';

type Props = {
  skills: (SkillNode & { unlocked?: boolean, icon?: any })[];
  onUnlock: (id: string) => void;
  canUnlock: (node: SkillNode & { unlocked?: boolean, icon?: any }) => boolean;
  shards: number;
};

// Layout fixe pour les nœuds existants
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  "s_ops_1": { x: 0.5, y: 0.9 },
  
  "s_click_1": { x: 0.2, y: 0.7 },
  "s_syn_1": { x: 0.4, y: 0.7 },
  "s_missions_1": { x: 0.6, y: 0.7 },
  "s_firewall_1": { x: 0.8, y: 0.7 },

  "s_overcharge_1": { x: 0.4, y: 0.5 },
  "s_overcharge_2": { x: 0.4, y: 0.35 },
  
  "s_ops_2": { x: 0.5, y: 0.15 },
};

export const SkillTreeCanvas = ({ skills, onUnlock, canUnlock, shards }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to get coords
  const getCoords = (id: string, width: number, height: number) => {
    const pos = NODE_POSITIONS[id] || { x: 0.5, y: 0.5 };
    return { x: pos.x * width, y: pos.y * height };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      const { width, height } = canvas.getBoundingClientRect();
      // Handle High DPI
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      // Draw Connections first
      skills.forEach(skill => {
        if (!skill.requires) return;
        const targetPos = getCoords(skill.id, width, height);
        
        skill.requires.forEach(reqId => {
          const reqPos = getCoords(reqId, width, height);
          const reqNode = skills.find(s => s.id === reqId);
          const isLinked = reqNode?.unlocked;
          const isTargetUnlocked = skill.unlocked;
          
          ctx.beginPath();
          ctx.moveTo(reqPos.x, reqPos.y);
          ctx.lineTo(targetPos.x, targetPos.y);
          
          // Style des liens
          if (isLinked) {
            ctx.strokeStyle = '#06b6d4'; // Cyan-500
            ctx.lineWidth = 2;
            if (isTargetUnlocked) {
               ctx.shadowBlur = 10;
               ctx.shadowColor = '#06b6d4';
            } else {
               ctx.shadowBlur = 0;
            }
          } else {
            ctx.strokeStyle = '#334155'; // Slate-700
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset

          // Animation de flux si débloqué
          if (isLinked) {
             const dist = Math.hypot(targetPos.x - reqPos.x, targetPos.y - reqPos.y);
             const offset = (time * 50) % dist;
             const angle = Math.atan2(targetPos.y - reqPos.y, targetPos.x - reqPos.x);
             
             const particleX = reqPos.x + Math.cos(angle) * offset;
             const particleY = reqPos.y + Math.sin(angle) * offset;
             
             // Check bounds roughly
             if (offset < dist) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                ctx.fill();
             }
          }
        });
      });

      // Draw Nodes
      skills.forEach(skill => {
        const { x, y } = getCoords(skill.id, width, height);
        const unlocked = skill.unlocked;
        const available = canUnlock(skill);
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        
        if (unlocked) {
           ctx.fillStyle = '#0891b2'; // Cyan-600
           ctx.shadowColor = '#22d3ee';
           ctx.shadowBlur = 15;
        } else if (available) {
           ctx.fillStyle = '#f59e0b'; // Amber-500 (Can buy)
           ctx.shadowColor = '#fbbf24';
           ctx.shadowBlur = 10 * Math.abs(Math.sin(time / 2)); // Pulse
        } else {
           ctx.fillStyle = '#1e293b'; // Slate-800
           ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = unlocked ? 2 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Icon Placeholder (first letter)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // ctx.fillText(skill.name[0], x, y); // Optional
        
        // Label
        ctx.fillStyle = unlocked ? '#22d3ee' : '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(skill.name, x, y + 35);
        
        if (!unlocked && available) {
             ctx.fillStyle = '#fbbf24';
             ctx.fillText(`${skill.costShards} Shards`, x, y + 48);
        }
      });

      animId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animId);
  }, [skills, shards, canUnlock]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find clicked node
    const { width, height } = rect;
    for (const skill of skills) {
        const pos = getCoords(skill.id, width, height);
        const dist = Math.hypot(x - pos.x, y - pos.y);
        if (dist < 25) { // Hitbox
            onUnlock(skill.id);
            break;
        }
    }
  };

  return (
    <div className="w-full h-[500px] bg-slate-950/50 rounded-xl relative overflow-hidden border border-white/10 shadow-inner">
       <canvas 
         ref={canvasRef} 
         className="w-full h-full cursor-pointer"
         onClick={handleClick}
       />
       <div className="absolute top-4 left-4 text-xs text-slate-400 pointer-events-none">
          Arbre de Compétences Neurales (Cliquer pour débloquer)
       </div>
    </div>
  );
};
