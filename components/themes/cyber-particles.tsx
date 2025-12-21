"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
}

export function CyberParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Génère 30 particules avec propriétés aléatoires
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 15
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="cyber-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="cyber-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
    </div>
  );
}
