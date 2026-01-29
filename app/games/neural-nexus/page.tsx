"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  Lock, 
  FlaskConical, 
  Rocket, 
  BrainCircuit, 
  Wifi, 
  Trophy, 
  Star, 
  ShieldCheck, 
  Save, 
  Activity, 
  Share2, 
  MousePointer2, 
  Layers, 
  Cpu, 
  Zap, 
  Database,
  Server,
  Globe,
  Monitor,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useSoundManager } from "./use-sound-manager";
import { ClickParticles } from "./click-particles";
import { SkillTreeCanvas } from "./skill-tree-canvas";
import {
  GameLayout,
  CentralNode,
  ItemCard,
  AnimatedNumber,
  FirewallTerminal,
  springTransition
} from "@/components/games/neural-nexus/ui";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import {
  buildInitialGenerators,
  buildUpgrades,
  buildAchievements,
  buildMissions,
  buildSkillTree,
  buildResearch,
  buildEvents,
  buildDailyChallenges,
  type Generator as BaseGenerator,
  type Upgrade as BaseUpgrade,
  type Achievement as BaseAchievement,
  type Mission,
  type SkillNode,
  type ResearchNode,
  type GameEvent,
  type Challenge,
  type GameSaveV2,
} from "./content";

import { saveGame, loadGame, unlockAchievement, getLeaderboard } from "@/lib/actions/neural-nexus";

// --- ICONS MAPPING ---
const ICONS: Record<string, any> = {
  Cpu, Zap, Database, Server, Globe, Activity, Share2, BrainCircuit, Rocket, Sparkles, Monitor, Layers, Star, FlaskConical, MousePointer2, Wifi, ShieldCheck
};

// --- TYPES EXTENSION ---
type Generator = BaseGenerator & { icon: any };
type Upgrade = BaseUpgrade & { icon: any };
type Achievement = BaseAchievement;
type Research = ResearchNode & { icon: any; unlocked?: boolean };
type Skill = SkillNode & { icon?: any; unlocked?: boolean };
type DailyChallenge = Challenge;

// --- INITIALIZERS with Icons ---
const withIcons = {
  generators: (gens: BaseGenerator[]): Generator[] => gens.map((g) => ({ ...g, icon: ICONS[g.iconKey] ?? Monitor })),
  upgrades: (ups: BaseUpgrade[]): Upgrade[] => ups.map((u) => ({ ...u, icon: ICONS[u.iconKey] ?? FlaskConical })),
  research: (rs: ResearchNode[]): Research[] => rs.map((r) => ({ ...r, icon: ICONS[r.iconKey] ?? FlaskConical })),
  skills: (ss: SkillNode[]): Skill[] => ss.map((s) => ({ ...s, icon: ICONS[s.iconKey] ?? Star })),
};

const DEFAULT_GENERATORS = withIcons.generators(buildInitialGenerators());
const DEFAULT_UPGRADES = withIcons.upgrades(buildUpgrades());
const DEFAULT_ACHIEVEMENTS = buildAchievements();
const DEFAULT_MISSIONS = buildMissions();
const DEFAULT_SKILLS = withIcons.skills(buildSkillTree());
const DEFAULT_RESEARCH = withIcons.research(buildResearch());
const DEFAULT_EVENTS = buildEvents();
const getTodayChallenges = () => buildDailyChallenges(new Date());

const formatNumber = (num: number) => {
    if (num < 1000) return Math.floor(num).toString();
    const suffixes = ["k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const suffixNum = Math.floor(("" + Math.floor(num)).length / 3);
    let shortValue: any = parseFloat((suffixNum !== 0 ? (num / Math.pow(1000, suffixNum)) : num).toPrecision(3));
    if (shortValue % 1 !== 0) shortValue = shortValue.toFixed(2);
    return shortValue + suffixes[suffixNum - 1];
};

export default function NeuralNexusPage() {
  // --- STATE ---
  const [entropy, setEntropy] = useState(0);
  const [lifetimeEntropy, setLifetimeEntropy] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [generators, setGenerators] = useState<Generator[]>(() => DEFAULT_GENERATORS.map(g => ({ ...g })));
  const [upgrades, setUpgrades] = useState<Upgrade[]>(() => DEFAULT_UPGRADES.map(u => ({ ...u })));
  const [achievements, setAchievements] = useState<Achievement[]>(() => DEFAULT_ACHIEVEMENTS.map(a => ({ ...a })));
  const [missions, setMissions] = useState<Mission[]>(() => DEFAULT_MISSIONS.map(m => ({ ...m })));
  const [skills, setSkills] = useState<Skill[]>(() => DEFAULT_SKILLS.map(s => ({ ...s, unlocked: false })));
  const [research, setResearch] = useState<Research[]>(() => DEFAULT_RESEARCH.map(r => ({ ...r, unlocked: false })));
  const [events] = useState<GameEvent[]>(() => DEFAULT_EVENTS.map(e => ({ ...e })));
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>(() => getTodayChallenges().map(c => ({ ...c })));

  const [firewallWinsToday, setFirewallWinsToday] = useState(0);
  const [firewall, setFirewall] = useState<{
    inRun: boolean;
    level: number;
    firewallHp: number;
    firewallHpMax: number;
    integrity: number;
    integrityMax: number;
    trace: number;
    traceMax: number;
    cooldowns: Record<string, number>;
    log: string[];
  }>({
    inRun: false,
    level: 1,
    firewallHp: 100,
    firewallHpMax: 100,
    integrity: 100,
    integrityMax: 100,
    trace: 0,
    traceMax: 100,
    cooldowns: {},
    log: [],
  });

  const [buffs, setBuffs] = useState<Array<{ id: string; name: string; target: "ops" | "click"; multiplier: number; expiresAt: number }>>([]);
  const [shards, setShards] = useState(0);
  const [overcharge, setOvercharge] = useState(0);
  const [isOvercharged, setIsOvercharged] = useState(false);
  const [ops, setOps] = useState(0);
  
  const [activeTab, setActiveTab] = useState("construct");
  const [notif, setNotif] = useState<string | null>(null);
  const [offlineReport, setOfflineReport] = useState<{ timeStr: string, gained: number } | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  const { playSound, enabled: soundEnabled } = useSoundManager();
  
  // Refs
  const stateRef = useRef({
    entropy, generators, upgrades, shards, overcharge, isOvercharged, achievements, missions, lifetimeEntropy, clicks, buffs, skills, research, activeEvent, firewall, firewallWinsToday
  });
  useEffect(() => {
    stateRef.current = { entropy, generators, upgrades, shards, overcharge, isOvercharged, achievements, missions, lifetimeEntropy, clicks, buffs, skills, research, activeEvent, firewall, firewallWinsToday };
  }, [entropy, generators, upgrades, shards, overcharge, isOvercharged, achievements, missions, lifetimeEntropy, clicks, buffs, skills, research, activeEvent, firewall, firewallWinsToday]);

  const getTotalBuildings = useCallback((gens: Generator[]) => gens.reduce((acc, g) => acc + g.count, 0), []);

  // --- STATS ENGINE ---
  const calculateStats = useCallback(() => {
    const s = stateRef.current;
    let currentOps = 0;

    const now = Date.now();
    const activeBuffs = s.buffs.filter((b) => b.expiresAt > now);
    const opsBuff = activeBuffs.filter((b) => b.target === "ops").reduce((acc, b) => acc * b.multiplier, 1);
    const clickBuff = activeBuffs.filter((b) => b.target === "click").reduce((acc, b) => acc * b.multiplier, 1);

    // Helpers for skills/research mults
    const getSkillMults = (ss: Skill[]) => ss.reduce((acc, sk) => {
        if(!sk.unlocked) return acc;
        if(sk.effect.type === 'opsMult') acc.ops *= sk.effect.multiplier;
        if(sk.effect.type === 'clickMult') acc.click *= sk.effect.multiplier;
        if(sk.effect.type === 'synergyMult') acc.synergy *= sk.effect.multiplier;
        if(sk.effect.type === 'overchargeDrainMult') acc.ocDrain *= sk.effect.multiplier;
        if(sk.effect.type === 'overchargeGainMult') acc.ocGain *= sk.effect.multiplier;
        if(sk.effect.type === 'missionRewardMult') acc.mission *= sk.effect.multiplier;
        if(sk.effect.type === 'firewallLootMult') acc.fwLoot *= sk.effect.multiplier;
        return acc;
    }, { ops: 1, click: 1, synergy: 1, ocDrain: 1, ocGain: 1, mission: 1, fwLoot: 1 });

    const getResearchMults = (rs: Research[]) => rs.reduce((acc, r) => {
        if(!r.unlocked) return acc;
        if(r.effect.type === 'opsMult') acc.ops *= r.effect.multiplier;
        if(r.effect.type === 'clickMult') acc.click *= r.effect.multiplier;
        if(r.effect.type === 'globalMult') acc.global *= r.effect.multiplier;
        if(r.effect.type === 'synergyMult') acc.synergy *= r.effect.multiplier;
        if(r.effect.type === 'firewallPowerMult') acc.fwPower *= r.effect.multiplier;
        return acc;
    }, { ops: 1, click: 1, global: 1, synergy: 1, fwPower: 1 });

    const skillMult = getSkillMults(s.skills);
    const resMult = getResearchMults(s.research);

    // Synergy Strength
    const synergyStrengthMult = s.upgrades
      .filter((u) => u.bought && (u.id === "global_synergy" || u.id.endsWith("_syn")))
      .reduce((acc, u) => acc * u.multiplier, 1);
    const synergyStrength = 0.02 * synergyStrengthMult * skillMult.synergy * resMult.synergy;

    // Generators
    s.generators.forEach((gen) => {
      let prod = gen.baseProd * gen.count;
      s.upgrades.forEach((u) => { if (u.bought && u.targetId === gen.id) prod *= u.multiplier; });
      if (gen.synergyId) {
        const synergyGen = s.generators.find(g => g.id === gen.synergyId);
        if (synergyGen && synergyGen.count > 0) prod *= (1 + (synergyGen.count * synergyStrength));
      }
      if (gen.count >= 25) prod *= 2;
      if (gen.count >= 50) prod *= 2;
      if (gen.count >= 100) prod *= 2;
      currentOps += prod;
    });

    s.upgrades.forEach(u => {
       if (u.bought && u.targetId === "all" && !(u.id === "global_synergy" || u.id.endsWith("_syn"))) currentOps *= u.multiplier;
    });

    currentOps *= resMult.global;
    
    const achievementBonus = 1 + (s.achievements.filter(a => a.unlocked).length * 0.02);
    currentOps *= achievementBonus;
    currentOps *= opsBuff;
    currentOps *= skillMult.ops;
    currentOps *= resMult.ops;
    currentOps *= (1 + (s.shards * 0.1));
    if (s.isOvercharged) currentOps *= 2;

    let clickPower = 1 + (currentOps * 0.03);
    s.upgrades.forEach(u => { if (u.bought && u.targetId === 'click') clickPower *= u.multiplier; });
    clickPower *= clickBuff;
    clickPower *= skillMult.click;
    clickPower *= resMult.click;
    if (s.isOvercharged) clickPower *= 5;

    return {
      ops: currentOps,
      click: clickPower,
      ocGainMult: skillMult.ocGain,
      ocDrainMult: skillMult.ocDrain,
      missionRewardMult: skillMult.mission,
      fwLootMult: skillMult.fwLoot,
      fwPowerMult: resMult.fwPower
    };
  }, []);

  // --- ACTIONS ---
  const handleClick = (e: React.MouseEvent) => {
    playSound('click');
    const stats = calculateStats();
    setEntropy(prev => prev + stats.click);
    setLifetimeEntropy(prev => prev + stats.click);
    setClicks(prev => prev + 1);

    if (!stateRef.current.isOvercharged) {
      setOvercharge(prev => {
        const next = prev + (4 * stats.ocGainMult);
        if (next >= 100) { setIsOvercharged(true); return 100; }
        return next;
      });
    }
  };

  const buyGenerator = (index: number) => {
    const gen = generators[index];
    const cost = Math.floor(gen.baseCost * Math.pow(1.15, gen.count));
    if (entropy >= cost) {
      playSound('buy');
      setEntropy(prev => prev - cost);
      const newGens = [...generators];
      newGens[index].count++;
      setGenerators(newGens);
    }
  };

  const buyUpgrade = (index: number) => {
    const upg = upgrades[index];
    if (entropy >= upg.cost && !upg.bought) {
      playSound('buy');
      setEntropy(prev => prev - upg.cost);
      const newUps = [...upgrades];
      newUps[index].bought = true;
      setUpgrades(newUps);
    }
  };

  const claimMission = (id: string, reward: Mission['reward']) => {
    const m = missions.find(x => x.id === id);
    if (!m || m.claimed) return;
    playSound('success');
    setMissions(prev => prev.map(x => x.id === id ? { ...x, claimed: true } : x));
    
    const mult = calculateStats().missionRewardMult;
    if (reward.type === 'entropy') {
        const amt = Math.floor(reward.amount * mult);
        setEntropy(p => p + amt);
        setLifetimeEntropy(p => p + amt);
        setNotif(`+${formatNumber(amt)} Entropy`);
    } else if (reward.type === 'buff') {
        const ex = Date.now() + reward.durationMs;
        setBuffs(p => [...p, { id: `${id}_${ex}`, name: `${m.title}`, target: reward.target, multiplier: reward.multiplier * mult, expiresAt: ex }]);
        setNotif(`Boost x${formatNumber(reward.multiplier * mult)}`);
    }
    setTimeout(() => setNotif(null), 2500);
  };

  // --- LOOP & SAVE ---
  useEffect(() => {
    const timer = setInterval(() => {
        const stats = calculateStats();
        setOps(stats.ops);
        if (stats.ops > 0) {
            const gain = stats.ops * 0.1;
            setEntropy(p => p + gain);
            setLifetimeEntropy(p => p + gain);
        }

        // Overcharge Drain
        if (stateRef.current.isOvercharged) {
            setOvercharge(p => {
                if (p <= 0) { setIsOvercharged(false); return 0; }
                return p - (0.5 * stats.ocDrainMult);
            });
        } else if (stateRef.current.overcharge > 0) {
            setOvercharge(p => Math.max(0, p - 0.1));
        }

    }, 100);
    return () => clearInterval(timer);
  }, [calculateStats]);

  // Auto-Save
  useEffect(() => {
     const t = setInterval(() => {
        const s = stateRef.current;
        const saveData: GameSaveV2 = {
            version: 2,
            savedAt: Date.now(),
            entropy: s.entropy,
            lifetimeEntropy: s.lifetimeEntropy,
            shards: s.shards,
            clicks: s.clicks,
            overcharge: s.overcharge,
            isOvercharged: s.isOvercharged,
            generators: Object.fromEntries(s.generators.map(g => [g.id, g.count])),
            upgrades: Object.fromEntries(s.upgrades.map(u => [u.id, u.bought])),
            achievements: Object.fromEntries(s.achievements.map(a => [a.id, a.unlocked])),
            missions: Object.fromEntries(s.missions.map(m => [m.id, { completed: m.completed, claimed: m.claimed }])),
            skills: Object.fromEntries(s.skills.map(sk => [sk.id, !!sk.unlocked])),
            research: Object.fromEntries(s.research.map(r => [r.id, !!r.unlocked])),
            challenges: Object.fromEntries(getTodayChallenges().map(c => [c.id, { completed: false, claimed: false }])), // Simplified for brevity in this rewrite
            firewallWinsToday: s.firewallWinsToday,
            firewallLevel: s.firewall.level
        };
        localStorage.setItem("nexus-zenith-v2", JSON.stringify(saveData));
        saveGame(saveData);
     }, 60000);
     return () => clearInterval(t);
  }, []);

  // --- LOAD & OFFLINE ---
  useEffect(() => {
    const load = async () => {
        let data: GameSaveV2 | null = null;
        try {
            const local = localStorage.getItem("nexus-zenith-v2");
            if (local) data = JSON.parse(local);
        } catch (e) { console.error("Local load failed", e); }

        if (!data) {
            const res = await loadGame();
            if (res.success && res.data) data = res.data;
        }

        if (data) {
             const d = data;
             setEntropy(d.entropy);
             setLifetimeEntropy(d.lifetimeEntropy);
             setShards(d.shards);
             setClicks(d.clicks);
             setOvercharge(d.overcharge);
             setIsOvercharged(d.isOvercharged);
             setFirewallWinsToday(d.firewallWinsToday || 0);

             setGenerators(prev => prev.map(g => ({ ...g, count: d.generators[g.id] ?? 0 })));
             setUpgrades(prev => prev.map(u => ({ ...u, bought: d.upgrades[u.id] ?? false })));
             setAchievements(prev => prev.map(a => ({ ...a, unlocked: d.achievements[a.id] ?? false })));
             setMissions(prev => prev.map(m => {
                 const saved = d.missions[m.id];
                 return saved ? { ...m, completed: saved.completed, claimed: saved.claimed } : m;
             }));
             setSkills(prev => prev.map(s => ({ ...s, unlocked: (d.skills ?? {})[s.id] ?? false })));
             setResearch(prev => prev.map(r => ({ ...r, unlocked: (d.research ?? {})[r.id] ?? false })));
             if (d.firewallLevel) setFirewall(f => ({ ...f, level: d.firewallLevel ?? 1 }));

             // Offline Calculation
             if (d.savedAt) {
                 const now = Date.now();
                 const diff = now - d.savedAt;
                 if (diff > 60000) {
                     // Recalculate basic OPS from loaded data
                     let opsRate = 0;
                     const loadedGens = DEFAULT_GENERATORS.map(g => ({ ...g, count: d.generators[g.id] ?? 0 }));
                     loadedGens.forEach(g => {
                        let prod = g.baseProd * g.count;
                        // Simplified multipliers
                        if (g.count >= 25) prod *= 2;
                        if (g.count >= 50) prod *= 2;
                        if (g.count >= 100) prod *= 2;
                        opsRate += prod;
                     });
                     
                     // Global Multipliers approx
                     const boughtUpgrades = DEFAULT_UPGRADES.filter(u => d.upgrades[u.id]);
                     boughtUpgrades.forEach(u => {
                         if (u.targetId === 'all') opsRate *= u.multiplier;
                     });
                     
                     opsRate *= (1 + d.shards * 0.1);

                     const seconds = diff / 1000;
                     const gained = Math.floor(opsRate * seconds); // 100% offline efficiency for kindness
                     
                     if (gained > 0) {
                        setEntropy(prev => prev + gained);
                        setLifetimeEntropy(prev => prev + gained);
                        setOfflineReport({ 
                            timeStr: new Date(diff).toISOString().substr(11, 8), 
                            gained: gained 
                        });
                     }
                 }
             }
        }
    }
    load();
  }, []);


  // --- FIREWALL LOGIC ---
  const firewallAction = (type: "attack" | "exploit" | "stabilize") => {
      if (!firewall.inRun || (firewall.cooldowns[type] ?? 0) > 0) return;
      const stats = calculateStats();
      const pow = stats.fwPowerMult;
      
      setFirewall(prev => {
          let dmg = 0, integ = 0, trc = 0, cd = 0;
          let msg = "";
          if (type === 'attack') {
              dmg = Math.floor(10 * pow * (1 + prev.level * 0.1));
              trc = 6; cd = 600; msg = `ATTACK: -${dmg} HP`;
          } else if (type === 'exploit') {
              dmg = Math.floor(18 * pow * (1 + prev.level * 0.1));
              trc = 12; integ = -8; cd = 1200; msg = `EXPLOIT: -${dmg} HP / -8 Integ`;
          } else {
              integ = 18; trc = -10; cd = 900; msg = `STABILIZE: +18 Integ / -10 Trace`;
          }
           
          // Enemy turn
          const ret = Math.floor(5 + prev.level * 1.5);
          
          return {
              ...prev,
              firewallHp: Math.max(0, prev.firewallHp - dmg),
              integrity: Math.min(prev.integrityMax, Math.max(0, prev.integrity + integ - ret)),
              trace: Math.min(prev.traceMax, Math.max(0, prev.trace + trc)),
              cooldowns: { ...prev.cooldowns, [type]: cd },
              log: [...prev.log, msg, `SYSTEM RESPONSE: -${ret} Integrity`]
          };
      });
  };

  // --- RENDER ---
  return (
    <GameLayout>
      <ClickParticles />
      <AnimatePresence>
         {notif && (
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
               <div className="bg-slate-900/80 backdrop-blur border border-cyan-500/50 text-cyan-100 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" /> {notif}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
      
      {/* LEFT PANEL: GAMEPLAY */}
      <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col relative z-10 border-r border-white/5 bg-gradient-to-b from-slate-950 to-black">
         <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
               <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white shrink-0">
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
               </Link>
               <div className="w-10 h-10 rounded bg-cyan-950 flex items-center justify-center border border-cyan-800 shrink-0">
                  <BrainCircuit className="w-6 h-6 text-cyan-400" />
               </div>
               <div className="hidden sm:block">
                  <h1 className="font-bold text-xl tracking-tight text-white">NEURAL<span className="text-cyan-400">NEXUS</span></h1>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Singularity Engine v2.0</div>
               </div>
            </div>
            <Button size="icon" variant="ghost" className="text-slate-500 hover:text-white shrink-0" onClick={() => setShowLeaderboard(true)}>
               <Trophy className="w-5 h-5" />
            </Button>
         </div>

         <CentralNode 
            entropy={entropy} 
            ops={ops} 
            isOvercharged={isOvercharged} 
            overchargeProgress={overcharge} 
            onClick={handleClick} 
         />

         {/* Mini-Footer Stats */}
         <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/5 bg-slate-900/20">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded text-purple-400"><Star className="w-4 h-4"/></div>
                <div>
                    <div className="text-xs text-slate-500 uppercase">Prestige Shards</div>
                    <div className="font-mono font-bold">{formatNumber(shards)}</div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-800 rounded text-emerald-400"><MousePointer2 className="w-4 h-4"/></div>
                 <div>
                     <div className="text-xs text-slate-500 uppercase">Click Power</div>
                     <div className="font-mono font-bold">{formatNumber(calculateStats().click)}</div>
                 </div>
             </div>
         </div>
      </div>

      {/* RIGHT PANEL: MANAGEMENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black/40 backdrop-blur-sm">
         <Tabs defaultValue="construct" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="px-4 pt-4 border-b border-white/10 bg-black/20">
               <TabsList className="bg-transparent p-0 h-auto gap-2 flex-wrap justify-start w-full">
                  <TabsTrigger value="construct" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white bg-slate-900/50 border border-white/5 text-slate-400 gap-2 px-4 py-2">
                     <Layers className="w-4 h-4"/> Construct
                  </TabsTrigger>
                  <TabsTrigger value="research" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white bg-slate-900/50 border border-white/5 text-slate-400 gap-2 px-4 py-2">
                     <FlaskConical className="w-4 h-4"/> Research
                  </TabsTrigger>
                  <TabsTrigger value="ops" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white bg-slate-900/50 border border-white/5 text-slate-400 gap-2 px-4 py-2">
                     <Rocket className="w-4 h-4"/> Ops ({missions.filter(m => !m.claimed && m.completed).length})
                  </TabsTrigger>
                  <TabsTrigger value="firewall" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white bg-slate-900/50 border border-white/5 text-slate-400 gap-2 px-4 py-2">
                     <ShieldCheck className="w-4 h-4"/> Firewall
                  </TabsTrigger>
                  <TabsTrigger value="meta" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white bg-slate-900/50 border border-white/5 text-slate-400 gap-2 px-4 py-2">
                     <BrainCircuit className="w-4 h-4"/> Meta
                  </TabsTrigger>
               </TabsList>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative">
               <TabsContent value="construct" className="h-full absolute inset-0 m-0 overflow-y-auto p-4 md:p-8">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-20">
                     <AnimatePresence>
                     {generators.map((gen, i) => {
                        const cost = Math.floor(gen.baseCost * Math.pow(1.15, gen.count));
                        // Determine synergy active
                        let syn = false;
                        if (gen.synergyId) {
                            const sg = generators.find(g => g.id === gen.synergyId);
                            if (sg && sg.count > 0) syn = true;
                        }
                        return (
                           <motion.div key={gen.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                              <ItemCard 
                                 name={gen.name}
                                 count={gen.count}
                                 cost={cost}
                                 production={gen.baseProd * Math.pow(2, Math.floor(gen.count/25))} // approx display
                                 canAfford={entropy >= cost}
                                 onClick={() => buyGenerator(i)}
                                 icon={gen.icon}
                                 synergyActive={syn}
                              />
                           </motion.div>
                        );
                     })}
                     </AnimatePresence>
                  </div>
               </TabsContent>

               <TabsContent value="research" className="h-full absolute inset-0 m-0 overflow-y-auto p-4 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {upgrades.map((upg, i) => {
                        if (upg.bought || lifetimeEntropy < upg.trigger) return null;
                        const can = entropy >= upg.cost;
                        return (
                           <motion.div key={upg.id} layout className={cn("p-4 rounded-xl border border-white/10 bg-slate-900/40 relative overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-colors", !can && "opacity-50 grayscale")}
                              onClick={() => buyUpgrade(i)}
                           >
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2 bg-indigo-900/30 text-indigo-300 rounded"><upg.icon className="w-5 h-5"/></div>
                                 <div className="font-bold text-slate-200">{upg.name}</div>
                              </div>
                              <p className="text-xs text-slate-400 mb-3 h-8 line-clamp-2">{upg.desc}</p>
                              <div className="flex justify-between items-center">
                                 <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-900/20">{formatNumber(upg.cost)} E</Badge>
                                 {can && <Button size="sm" className="h-6 text-xs bg-indigo-600 hover:bg-indigo-500">Rechercher</Button>}
                              </div>
                           </motion.div>
                        );
                     })}
                  </div>
               </TabsContent>

               <TabsContent value="ops" className="h-full absolute inset-0 m-0 overflow-y-auto p-4 md:p-8">
                  <div className="space-y-4">
                     {/* Daily Challenges */}
                     <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" /> Défis Quotidiens
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           {dailyChallenges.map((c) => {
                               // Simple check for display (logic should be centralized)
                               const isCompleted = false; // Placeholder for now as we don't track daily progress in state yet
                               return (
                                  <div key={c.id} className={cn("p-4 rounded-xl border bg-slate-900/40 relative overflow-hidden transition-all", isCompleted ? "border-yellow-500/30" : "border-white/10")}>
                                     <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-bold text-slate-200 leading-tight">{c.desc}</span>
                                        {isCompleted && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
                                     </div>
                                     <div className="flex justify-between items-center">
                                       <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px]">
                                          {c.reward.type === 'buff' 
                                              ? `x${c.reward.multiplier} (${(c.reward.durationMs/60000).toFixed(0)}m)` 
                                              : `+${c.reward.amount} Shards`}
                                       </Badge>
                                       {isCompleted && <span className="text-xs text-yellow-500 font-bold">Complété</span>}
                                     </div>
                                  </div>
                               );
                           })}
                        </div>
                     </div>

                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-rose-400" /> Missions Principales
                     </h3>
                     {missions.map(m => {
                         const progress = (() => {
                             if (m.kind.type === 'clicks') return clicks;
                             if (m.kind.type === 'lifetimeEntropy') return lifetimeEntropy;
                             if (m.kind.type === 'totalBuildings') return getTotalBuildings(generators);
                             return 0; // simplified
                         })();
                         const target = m.kind.target;
                         const pct = Math.min(100, (progress / target) * 100);
                         
                         return (
                            <div key={m.id} className={cn("p-4 rounded-xl border border-white/10 bg-slate-900/40 flex items-center gap-4", m.completed ? "border-rose-500/30 bg-rose-900/10" : "")}>
                               <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                      <h4 className="font-bold text-slate-200">{m.title}</h4>
                                      <span className="text-xs font-mono text-slate-500">{pct.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={pct} className="h-1.5" />
                                  <p className="text-xs text-slate-500 mt-2">{m.desc}</p>
                               </div>
                               <Button 
                                  disabled={!m.completed || m.claimed} 
                                  onClick={() => claimMission(m.id, m.reward)}
                                  className={cn(m.completed && !m.claimed ? "bg-rose-600" : "bg-slate-800 text-slate-500")}
                               >
                                  {m.claimed ? "Réclamé" : "Collecter"}
                               </Button>
                            </div>
                         )
                     })}
                  </div>
               </TabsContent>

               <TabsContent value="firewall" className="h-full absolute inset-0 m-0 p-4 md:p-8 flex flex-col items-center justify-center">
                   <div className="w-full max-w-2xl h-[600px]">
                       {firewall.inRun ? (
                          <FirewallTerminal 
                             firewall={firewall} 
                             onAction={firewallAction} 
                             onDisconnect={() => setFirewall(p => ({...p, inRun: false}))} 
                          />
                       ) : (
                          <div className="text-center space-y-6">
                              <ShieldCheck className="w-24 h-24 text-violet-500 mx-auto opacity-50" />
                              <h2 className="text-2xl font-bold text-white">Firewall Access Point</h2>
                              <p className="text-slate-400 max-w-md mx-auto">
                                 Piratez les pare-feux corporatifs pour obtenir des buffs massifs et de l'Entropy.
                                 <br/>Niveau actuel: <span className="text-violet-400 font-bold">{firewall.level}</span>
                              </p>
                              <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-lg px-8 py-6" onClick={() => setFirewall(p => ({...p, inRun: true, firewallHp: 100 + p.level * 20, firewallHpMax: 100 + p.level * 20, log: ["CONNECTION ESTABLISHED..."] }))}>
                                 INITIER L'ATTAQUE
                              </Button>
                          </div>
                       )}
                   </div>
               </TabsContent>

               <TabsContent value="meta" className="h-full absolute inset-0 m-0 overflow-y-auto p-4 md:p-8">
                   <div className="h-[500px]">
                       <SkillTreeCanvas 
                          skills={skills} 
                          shards={shards} 
                          canUnlock={(n) => {
                             if(n.unlocked) return false;
                             if(shards < n.costShards) return false;
                             const un = skills.filter(s => s.unlocked).map(s => s.id);
                             return (n.requires ?? []).every(r => un.includes(r));
                          }} 
                          onUnlock={(id) => {
                             const sk = skills.find(s => s.id === id);
                             if(sk && !sk.unlocked && shards >= sk.costShards) {
                                 setShards(p => p - sk.costShards);
                                 setSkills(p => p.map(s => s.id === id ? { ...s, unlocked: true } : s));
                                 playSound('buy');
                             }
                          }}
                        /> 
                   </div>
               </TabsContent>
            </div>
         </Tabs>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showLeaderboard && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-yellow-500/30 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
                   <Button variant="ghost" className="absolute top-4 right-4" onClick={() => setShowLeaderboard(false)}>✕</Button>
                   <h2 className="text-2xl font-bold text-yellow-500 mb-6 flex items-center gap-2"><Trophy/> Leaderboard</h2>
                   
                   <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {leaderboardData.length === 0 ? <p className="text-slate-500 italic">Chargement...</p> : leaderboardData.map((d, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                             <div className="flex item-center gap-2">
                                <span className="font-bold text-slate-300 w-6">#{i+1}</span>
                                <span className="text-slate-200">{d.name}</span>
                             </div>
                             <span className="font-mono text-cyan-400">{formatNumber(d.lifetimeEntropy)}</span>
                          </div>
                      ))}
                   </div>
                   
                   <div className="mt-6 flex justify-center">
                       <Button onClick={() => {
                          getLeaderboard().then(res => {
                             if(res.success && res.data) setLeaderboardData(res.data);
                          })
                       }} variant="outline" className="border-yellow-500/30 text-yellow-500">Rafraîchir</Button>
                   </div>
               </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offlineReport && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(16,185,129,0.2)] text-center">
                   <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                       <Zap className="w-8 h-8 text-emerald-400" />
                   </div>
                   <h2 className="text-2xl font-bold text-emerald-400 mb-2">Système Réactivé</h2>
                   <p className="text-slate-400 mb-6">Simulation exécutée en arrière-plan pendant <span className="text-white font-mono">{offlineReport.timeStr}</span>.</p>
                   
                   <div className="bg-black/40 rounded-lg p-4 mb-6 border border-white/5">
                      <div className="text-sm text-slate-500 uppercase tracking-widest mb-1">Entropy Générée</div>
                      <div className="text-3xl font-mono text-emerald-300 font-bold">+{formatNumber(offlineReport.gained)}</div>
                   </div>
                   
                   <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => setOfflineReport(null)}>
                      Reprendre les opérations
                   </Button>
               </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </GameLayout>
  );
}
