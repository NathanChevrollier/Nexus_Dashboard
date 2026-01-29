export type Generator = {
  id: string;
  name: string;
  baseCost: number;
  baseProd: number;
  count: number;
  iconKey: string;
  color: string;
  desc: string;
  synergyId?: string;
};

export type Upgrade = {
  id: string;
  name: string;
  cost: number;
  trigger: number;
  multiplier: number;
  targetId: string | "all" | "click";
  desc: string;
  bought: boolean;
  iconKey: string;
};

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  kind:
    | { type: "lifetimeEntropy"; target: number }
    | { type: "clicks"; target: number }
    | { type: "totalBuildings"; target: number }
    | { type: "shards"; target: number };
  unlocked: boolean;
  reward: string;
};

export type MissionReward =
  | { type: "entropy"; amount: number }
  | { type: "buff"; target: "ops" | "click"; multiplier: number; durationMs: number };

export type Mission = {
  id: string;
  title: string;
  desc: string;
  kind:
    | { type: "clicks"; target: number }
    | { type: "lifetimeEntropy"; target: number }
    | { type: "bankEntropy"; target: number }
    | { type: "buyGenerator"; generatorId: string; target: number }
    | { type: "totalBuildings"; target: number };
  reward: MissionReward;
  completed: boolean;
  claimed: boolean;
};

export type GameSaveV2 = {
  version: 2;
  savedAt: number;
  entropy: number;
  lifetimeEntropy: number;
  shards: number;
  clicks: number;
  overcharge: number;
  isOvercharged: boolean;
  generators: Record<string, number>; // id -> count
  upgrades: Record<string, boolean>; // id -> bought
  achievements: Record<string, boolean>; // id -> unlocked
  missions: Record<string, { completed: boolean; claimed: boolean }>; // id -> status
  skills?: Record<string, boolean>; // id -> unlocked
  research?: Record<string, boolean>; // id -> unlocked
  challenges?: Record<string, { completed: boolean; claimed: boolean }>; // id -> status
  firewallWinsToday?: number;
  firewallLevel?: number;
};

export type SkillEffect =
  | { type: "opsMult"; multiplier: number }
  | { type: "clickMult"; multiplier: number }
  | { type: "synergyMult"; multiplier: number }
  | { type: "overchargeDrainMult"; multiplier: number }
  | { type: "overchargeGainMult"; multiplier: number }
  | { type: "missionRewardMult"; multiplier: number }
  | { type: "firewallLootMult"; multiplier: number };

export type SkillNode = {
  id: string;
  name: string;
  desc: string;
  costShards: number;
  iconKey: string;
  effect: SkillEffect;
  requires?: string[];
};

export type ResearchEffect =
  | { type: "opsMult"; multiplier: number }
  | { type: "clickMult"; multiplier: number }
  | { type: "globalMult"; multiplier: number }
  | { type: "synergyMult"; multiplier: number }
  | { type: "firewallPowerMult"; multiplier: number };

export type ResearchNode = {
  id: string;
  pathId: "offense" | "defense" | "economy";
  tier: number;
  name: string;
  desc: string;
  costEntropy: number;
  triggerLifetimeEntropy: number;
  iconKey: string;
  effect: ResearchEffect;
  requires?: string[];
  exclusiveGroupId?: string; // ex: "path_choice" => un seul des paths peut être pris
};

export type EventChoice = {
  id: string;
  label: string;
  desc: string;
  outcome:
    | { type: "entropy"; amount: number }
    | { type: "buff"; target: "ops" | "click"; multiplier: number; durationMs: number }
    | { type: "overcharge"; amount: number }
    | { type: "shards"; amount: number };
  risk?: { type: "entropyLoss"; amount: number };
};

export type GameEvent = {
  id: string;
  title: string;
  desc: string;
  iconKey: string;
  weight: number;
  minLifetimeEntropy: number;
  choices: EventChoice[];
};

export type Challenge = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  desc: string;
  kind:
    | { type: "clicks"; target: number }
    | { type: "lifetimeEntropy"; target: number }
    | { type: "firewallWins"; target: number };
  reward:
    | { type: "entropy"; amount: number }
    | { type: "shards"; amount: number }
    | { type: "buff"; target: "ops" | "click"; multiplier: number; durationMs: number };
  completed: boolean;
  claimed: boolean;
};

export const GENERATOR_DEFS: Array<Omit<Generator, "count">> = [
  { id: "script", name: "Script Shell", baseCost: 15, baseProd: 0.5, iconKey: "Monitor", color: "text-cyan-400", desc: "Automatisation basique.", synergyId: "botnet" },
  { id: "botnet", name: "Réseau Neural", baseCost: 100, baseProd: 4, iconKey: "Share2", color: "text-indigo-400", desc: "Noeuds interconnectés.", synergyId: "server" },
  { id: "server", name: "Serveur Quantum", baseCost: 1100, baseProd: 22, iconKey: "Server", color: "text-violet-400", desc: "Calcul probabiliste.", synergyId: "ai" },
  { id: "ai", name: "IA Consciente", baseCost: 12000, baseProd: 150, iconKey: "BrainCircuit", color: "text-fuchsia-400", desc: "Pensée autonome.", synergyId: "dyson" },
  { id: "dyson", name: "Sphère Dyson", baseCost: 130000, baseProd: 1000, iconKey: "Globe", color: "text-orange-400", desc: "Energie stellaire.", synergyId: "reality" },
  { id: "reality", name: "Moteur Réalité", baseCost: 2000000, baseProd: 8500, iconKey: "Sparkles", color: "text-yellow-400", desc: "Modification du réel.", synergyId: "chronos" },

  // Extension de contenu (tiers supérieurs)
  { id: "chronos", name: "Collecteur Chronos", baseCost: 50000000, baseProd: 65000, iconKey: "Activity", color: "text-emerald-400", desc: "Récupère des cycles perdus.", synergyId: "vault" },
  { id: "vault", name: "Coffre Akashique", baseCost: 850000000, baseProd: 480000, iconKey: "Database", color: "text-sky-400", desc: "Archive totale des possibles.", synergyId: "layers" },
  { id: "layers", name: "Strates Simulées", baseCost: 12000000000, baseProd: 3600000, iconKey: "Layers", color: "text-blue-400", desc: "Empile des mondes virtuels.", synergyId: "nexus" },
  { id: "nexus", name: "Nexus d’Entropie", baseCost: 180000000000, baseProd: 28000000, iconKey: "Cpu", color: "text-teal-300", desc: "Concentre l’énergie du chaos.", synergyId: "singularity" },
  { id: "singularity", name: "Forge de Singularité", baseCost: 3000000000000, baseProd: 230000000, iconKey: "Rocket", color: "text-purple-300", desc: "Condense la croissance en point de rupture.", synergyId: "protocol" },
  { id: "protocol", name: "Protocole Oméga", baseCost: 45000000000000, baseProd: 1900000000, iconKey: "Terminal", color: "text-pink-300", desc: "Réécrit les règles du système.", synergyId: "shield" },
  { id: "shield", name: "Pare-feu Sentient", baseCost: 800000000000000, baseProd: 16000000000, iconKey: "ShieldCheck", color: "text-rose-300", desc: "Défense adaptative, rendement stable.", synergyId: "core" },
  { id: "core", name: "Coeur Matriciel", baseCost: 15000000000000000, baseProd: 140000000000, iconKey: "Zap", color: "text-amber-300", desc: "Pulse d’énergie brute.", synergyId: "horizon" },
  { id: "horizon", name: "Horizon Fractal", baseCost: 350000000000000000, baseProd: 1250000000000, iconKey: "Sparkles", color: "text-lime-300", desc: "Infini compressé.", synergyId: "fabric" },
  { id: "fabric", name: "Tisseur du Réel", baseCost: 8000000000000000000, baseProd: 11500000000000, iconKey: "Globe", color: "text-yellow-200", desc: "Recompose la matière-information.", synergyId: "apex" },
  { id: "apex", name: "Apex Cognitif", baseCost: 200000000000000000000, baseProd: 110000000000000, iconKey: "BrainCircuit", color: "text-white", desc: "Conscience maximale : production extrême." },
];

const UPGRADE_TEMPLATES: Array<{
  suffixId: string;
  title: (gName: string) => string;
  desc: (gName: string) => string;
  multiplier: number;
  iconKey: string;
  costFactor: number;
  triggerFactor: number;
}> = [
  {
    suffixId: "opt",
    title: (gName) => `Optimisation: ${gName}`,
    desc: (gName) => `${gName} x2` ,
    multiplier: 2,
    iconKey: "FlaskConical",
    costFactor: 12,
    triggerFactor: 45,
  },
  {
    suffixId: "oc",
    title: (gName) => `Overclock: ${gName}`,
    desc: (gName) => `${gName} x2` ,
    multiplier: 2,
    iconKey: "Zap",
    costFactor: 40,
    triggerFactor: 180,
  },
  {
    suffixId: "syn",
    title: (gName) => `Chaînage: ${gName}`,
    desc: () => "Synergies +50%" ,
    multiplier: 1.5,
    iconKey: "Wifi",
    costFactor: 65,
    triggerFactor: 260,
  },
  {
    suffixId: "mil",
    title: (gName) => `Milestone: ${gName}`,
    desc: () => "Milestones plus efficaces" ,
    multiplier: 1.15,
    iconKey: "Star",
    costFactor: 85,
    triggerFactor: 400,
  },
];

export function buildInitialGenerators(): Generator[] {
  return GENERATOR_DEFS.map((g) => ({ ...g, count: 0 }));
}

export function buildUpgrades(): Upgrade[] {
  const upgrades: Upgrade[] = [
    {
      id: "click1",
      name: "Souris Mécanique",
      cost: 500,
      trigger: 100,
      multiplier: 2,
      targetId: "click",
      desc: "Clics x2",
      bought: false,
      iconKey: "MousePointer2",
    },
    {
      id: "click2",
      name: "Doigts Bioniques",
      cost: 15000,
      trigger: 10000,
      multiplier: 4,
      targetId: "click",
      desc: "Clics x4",
      bought: false,
      iconKey: "Zap",
    },
    {
      id: "global_synergy",
      name: "Protocoles Liés",
      cost: 5000,
      trigger: 2000,
      multiplier: 1.5,
      targetId: "all",
      desc: "Synergies +50%",
      bought: false,
      iconKey: "Wifi",
    },
  ];

  for (const gen of GENERATOR_DEFS) {
    for (const tpl of UPGRADE_TEMPLATES) {
      const isSynergyGlobal = tpl.suffixId === "syn";
      const targetId: Upgrade["targetId"] = isSynergyGlobal ? "all" : gen.id;
      upgrades.push({
        id: `${gen.id}_${tpl.suffixId}`,
        name: tpl.title(gen.name),
        cost: Math.max(200, Math.floor(gen.baseCost * tpl.costFactor)),
        trigger: Math.max(100, Math.floor(gen.baseCost * tpl.triggerFactor)),
        multiplier: tpl.multiplier,
        targetId,
        desc: tpl.desc(gen.name),
        bought: false,
        iconKey: tpl.iconKey,
      });
    }
  }

  return upgrades;
}

export function buildAchievements(): Achievement[] {
  const achievements: Achievement[] = [];

  const entropyMilestones = [
    1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12,
    1e13, 1e14, 1e15,
  ];
  entropyMilestones.forEach((v, idx) => {
    achievements.push({
      id: `entropy_${idx}`,
      name: idx === 0 ? "Hello World" : `Entropie ${idx + 1}x`,
      desc: `Générer ${v.toLocaleString("fr-FR")} Entropy (cumulé)`,
      kind: { type: "lifetimeEntropy", target: v },
      unlocked: false,
      reward: `+${Math.min(60, 5 + idx * 2)}% Prod`,
    });
  });

  const clickMilestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 250000, 500000, 1000000];
  clickMilestones.forEach((v, idx) => {
    achievements.push({
      id: `clicks_${idx}`,
      name: idx === 0 ? "Premier Contact" : `Doigt ${idx + 1}x`,
      desc: `${v.toLocaleString("fr-FR")} clics manuels`,
      kind: { type: "clicks", target: v },
      unlocked: false,
      reward: `+${Math.min(100, 5 + idx * 3)}% Click`,
    });
  });

  const buildingMilestones = [10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500];
  buildingMilestones.forEach((v, idx) => {
    achievements.push({
      id: `buildings_${idx}`,
      name: idx === 0 ? "Architecte" : `Mégastructure ${idx + 1}x`,
      desc: `Posséder ${v.toLocaleString("fr-FR")} bâtiments`,
      kind: { type: "totalBuildings", target: v },
      unlocked: false,
      reward: `+${Math.min(80, 5 + idx * 2)}% Prod`,
    });
  });

  const shardMilestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  shardMilestones.forEach((v, idx) => {
    achievements.push({
      id: `shards_${idx}`,
      name: idx === 0 ? "Étincelle" : `Singularité ${idx + 1}x`,
      desc: `Atteindre ${v.toLocaleString("fr-FR")} shards`,
      kind: { type: "shards", target: v },
      unlocked: false,
      reward: `+${Math.min(120, 10 + idx * 5)}% Prod`,
    });
  });

  return achievements;
}

export function buildMissions(): Mission[] {
  const missions: Mission[] = [];

  const tiers = [
    { id: "t0", clicks: 100, life: 5_000, bank: 1_000, buildings: 10, reward: { type: "buff" as const, target: "ops" as const, multiplier: 1.25, durationMs: 60_000 } },
    { id: "t1", clicks: 500, life: 25_000, bank: 10_000, buildings: 25, reward: { type: "buff" as const, target: "click" as const, multiplier: 1.5, durationMs: 60_000 } },
    { id: "t2", clicks: 2_000, life: 150_000, bank: 50_000, buildings: 50, reward: { type: "entropy" as const, amount: 25_000 } },
    { id: "t3", clicks: 10_000, life: 1_000_000, bank: 200_000, buildings: 100, reward: { type: "buff" as const, target: "ops" as const, multiplier: 2, durationMs: 90_000 } },
    { id: "t4", clicks: 50_000, life: 10_000_000, bank: 1_000_000, buildings: 250, reward: { type: "entropy" as const, amount: 1_000_000 } },
  ];

  for (const tier of tiers) {
    missions.push({
      id: `ops_${tier.id}_clicks`,
      title: "Opération: Injection",
      desc: `Effectuer ${tier.clicks.toLocaleString("fr-FR")} clics.`,
      kind: { type: "clicks", target: tier.clicks },
      reward: tier.reward,
      completed: false,
      claimed: false,
    });
    missions.push({
      id: `ops_${tier.id}_life`,
      title: "Opération: Accumulation",
      desc: `Générer ${tier.life.toLocaleString("fr-FR")} Entropy (cumulé).`,
      kind: { type: "lifetimeEntropy", target: tier.life },
      reward: tier.reward,
      completed: false,
      claimed: false,
    });
    missions.push({
      id: `ops_${tier.id}_bank`,
      title: "Opération: Liquidité",
      desc: `Avoir ${tier.bank.toLocaleString("fr-FR")} Entropy en banque.`,
      kind: { type: "bankEntropy", target: tier.bank },
      reward: tier.reward,
      completed: false,
      claimed: false,
    });
    missions.push({
      id: `ops_${tier.id}_buildings`,
      title: "Opération: Expansion",
      desc: `Posséder ${tier.buildings.toLocaleString("fr-FR")} bâtiments.`,
      kind: { type: "totalBuildings", target: tier.buildings },
      reward: tier.reward,
      completed: false,
      claimed: false,
    });
  }

  // Missions ciblées par générateur (x contenu rapide)
  const pick = GENERATOR_DEFS.slice(0, Math.min(10, GENERATOR_DEFS.length));
  pick.forEach((g, idx) => {
    const target = idx < 3 ? 25 : idx < 6 ? 10 : 5;
    missions.push({
      id: `ops_buy_${g.id}`,
      title: "Contrat: Déploiement",
      desc: `Acheter ${target}x ${g.name}.`,
      kind: { type: "buyGenerator", generatorId: g.id, target },
      reward: { type: "buff", target: "ops", multiplier: 1.35, durationMs: 60_000 },
      completed: false,
      claimed: false,
    });
  });

  return missions;
}

export function buildSkillTree(): SkillNode[] {
  return [
    {
      id: "s_ops_1",
      name: "Amplificateur d’OPS",
      desc: "+10% OPS (multiplicatif)",
      costShards: 1,
      iconKey: "Activity",
      effect: { type: "opsMult", multiplier: 1.1 },
    },
    {
      id: "s_click_1",
      name: "Interface Haptique",
      desc: "+15% Click (multiplicatif)",
      costShards: 1,
      iconKey: "MousePointer2",
      effect: { type: "clickMult", multiplier: 1.15 },
    },
    {
      id: "s_syn_1",
      name: "Bus de Synergie",
      desc: "+20% force des synergies",
      costShards: 2,
      iconKey: "Wifi",
      effect: { type: "synergyMult", multiplier: 1.2 },
      requires: ["s_ops_1"],
    },
    {
      id: "s_overcharge_1",
      name: "Dissipation Thermique",
      desc: "Surcharge dure plus longtemps (-20% drain)",
      costShards: 3,
      iconKey: "ShieldCheck",
      effect: { type: "overchargeDrainMult", multiplier: 0.8 },
      requires: ["s_syn_1"],
    },
    {
      id: "s_overcharge_2",
      name: "Injecteur d’Énergie",
      desc: "La surcharge monte plus vite (+25% gain)",
      costShards: 5,
      iconKey: "Zap",
      effect: { type: "overchargeGainMult", multiplier: 1.25 },
      requires: ["s_overcharge_1"],
    },
    {
      id: "s_missions_1",
      name: "Directive d’Opérations",
      desc: "+20% récompenses de missions",
      costShards: 4,
      iconKey: "Rocket",
      effect: { type: "missionRewardMult", multiplier: 1.2 },
      requires: ["s_ops_1"],
    },
    {
      id: "s_firewall_1",
      name: "Décryptage Avancé",
      desc: "+25% loot Firewall Battles",
      costShards: 4,
      iconKey: "Terminal",
      effect: { type: "firewallLootMult", multiplier: 1.25 },
      requires: ["s_ops_1"],
    },
    {
      id: "s_ops_2",
      name: "Accélérateur Quantique",
      desc: "+25% OPS (multiplicatif)",
      costShards: 10,
      iconKey: "Cpu",
      effect: { type: "opsMult", multiplier: 1.25 },
      requires: ["s_overcharge_2", "s_missions_1"],
    },
  ];
}

export function buildResearch(): ResearchNode[] {
  const base = {
    tier1: { cost: 50_000, trigger: 50_000 },
    tier2: { cost: 500_000, trigger: 500_000 },
    tier3: { cost: 5_000_000, trigger: 5_000_000 },
  };

  return [
    {
      id: "r_choice_offense",
      pathId: "offense",
      tier: 1,
      name: "Voie Offense",
      desc: "Choix de spécialisation : click + firewall.",
      costEntropy: 25_000,
      triggerLifetimeEntropy: 25_000,
      iconKey: "Zap",
      effect: { type: "clickMult", multiplier: 1.15 },
      exclusiveGroupId: "path_choice",
    },
    {
      id: "r_choice_defense",
      pathId: "defense",
      tier: 1,
      name: "Voie Défense",
      desc: "Choix de spécialisation : surcharge + stabilité.",
      costEntropy: 25_000,
      triggerLifetimeEntropy: 25_000,
      iconKey: "ShieldCheck",
      effect: { type: "synergyMult", multiplier: 1.1 },
      exclusiveGroupId: "path_choice",
    },
    {
      id: "r_choice_economy",
      pathId: "economy",
      tier: 1,
      name: "Voie Économie",
      desc: "Choix de spécialisation : OPS global.",
      costEntropy: 25_000,
      triggerLifetimeEntropy: 25_000,
      iconKey: "Database",
      effect: { type: "globalMult", multiplier: 1.1 },
      exclusiveGroupId: "path_choice",
    },

    // Suites par voie (gated par requires)
    {
      id: "r_off_2",
      pathId: "offense",
      tier: 2,
      name: "Injection Critique",
      desc: "Click x1.25",
      costEntropy: base.tier1.cost,
      triggerLifetimeEntropy: base.tier1.trigger,
      iconKey: "MousePointer2",
      effect: { type: "clickMult", multiplier: 1.25 },
      requires: ["r_choice_offense"],
    },
    {
      id: "r_off_3",
      pathId: "offense",
      tier: 3,
      name: "Brèche Résonante",
      desc: "Puissance Firewall x1.25",
      costEntropy: base.tier2.cost,
      triggerLifetimeEntropy: base.tier2.trigger,
      iconKey: "Terminal",
      effect: { type: "firewallPowerMult", multiplier: 1.25 },
      requires: ["r_off_2"],
    },
    {
      id: "r_def_2",
      pathId: "defense",
      tier: 2,
      name: "Réseau Tolérant",
      desc: "Synergies x1.25",
      costEntropy: base.tier1.cost,
      triggerLifetimeEntropy: base.tier1.trigger,
      iconKey: "Wifi",
      effect: { type: "synergyMult", multiplier: 1.25 },
      requires: ["r_choice_defense"],
    },
    {
      id: "r_def_3",
      pathId: "defense",
      tier: 3,
      name: "Cage de Faraday",
      desc: "Global x1.15",
      costEntropy: base.tier2.cost,
      triggerLifetimeEntropy: base.tier2.trigger,
      iconKey: "ShieldCheck",
      effect: { type: "globalMult", multiplier: 1.15 },
      requires: ["r_def_2"],
    },
    {
      id: "r_eco_2",
      pathId: "economy",
      tier: 2,
      name: "Cache Distribué",
      desc: "OPS x1.2",
      costEntropy: base.tier1.cost,
      triggerLifetimeEntropy: base.tier1.trigger,
      iconKey: "Activity",
      effect: { type: "opsMult", multiplier: 1.2 },
      requires: ["r_choice_economy"],
    },
    {
      id: "r_eco_3",
      pathId: "economy",
      tier: 3,
      name: "Compression Entropique",
      desc: "Global x1.15",
      costEntropy: base.tier2.cost,
      triggerLifetimeEntropy: base.tier2.trigger,
      iconKey: "Sparkles",
      effect: { type: "globalMult", multiplier: 1.15 },
      requires: ["r_eco_2"],
    },
  ];
}

export function buildEvents(): GameEvent[] {
  return [
    {
      id: "e_packet_storm",
      title: "Tempête de Paquets",
      desc: "Un flux instable traverse le réseau. Le capter peut rapporter gros… ou brûler de l’Entropy.",
      iconKey: "Globe",
      weight: 10,
      minLifetimeEntropy: 10_000,
      choices: [
        {
          id: "capture",
          label: "Capturer",
          desc: "+Entropy, risque de perte",
          outcome: { type: "entropy", amount: 25_000 },
          risk: { type: "entropyLoss", amount: 10_000 },
        },
        {
          id: "stabilize",
          label: "Stabiliser",
          desc: "Boost OPS temporaire",
          outcome: { type: "buff", target: "ops", multiplier: 1.5, durationMs: 45_000 },
        },
      ],
    },
    {
      id: "e_black_ice",
      title: "Black ICE",
      desc: "Un pare-feu agressif verrouille un nœud. Le forcer charge la surcharge.",
      iconKey: "ShieldCheck",
      weight: 8,
      minLifetimeEntropy: 50_000,
      choices: [
        {
          id: "force",
          label: "Forcer",
          desc: "+Surcharge",
          outcome: { type: "overcharge", amount: 35 },
        },
        {
          id: "bypass",
          label: "Bypass",
          desc: "+Entropy",
          outcome: { type: "entropy", amount: 40_000 },
        },
      ],
    },
    {
      id: "e_shard_echo",
      title: "Écho de Shard",
      desc: "Une résonance de singularité apparaît. Récupérer l’écho peut donner des shards.",
      iconKey: "Star",
      weight: 4,
      minLifetimeEntropy: 2_000_000,
      choices: [
        {
          id: "claim",
          label: "Récolter",
          desc: "+1 shard",
          outcome: { type: "shards", amount: 1 },
        },
        {
          id: "amplify",
          label: "Amplifier",
          desc: "Boost click temporaire",
          outcome: { type: "buff", target: "click", multiplier: 2, durationMs: 30_000 },
        },
      ],
    },
  ];
}

export function buildDailyChallenges(date: Date): Challenge[] {
  const dateKey = date.toISOString().slice(0, 10);
  // Simple rotation deterministic par jour
  const day = Math.floor(date.getTime() / 86_400_000);
  const pick = day % 3;

  const base: Challenge[] = [
    {
      id: `c_${dateKey}_clicks`,
      dateKey,
      title: "Défi du jour: Frénésie",
      desc: "Atteindre 2 000 clics aujourd’hui.",
      kind: { type: "clicks", target: 2_000 },
      reward: { type: "buff", target: "click", multiplier: 2, durationMs: 60_000 },
      completed: false,
      claimed: false,
    },
    {
      id: `c_${dateKey}_entropy`,
      dateKey,
      title: "Défi du jour: Accumulation",
      desc: "Générer 500 000 Entropy (cumulé) aujourd’hui.",
      kind: { type: "lifetimeEntropy", target: 500_000 },
      reward: { type: "entropy", amount: 200_000 },
      completed: false,
      claimed: false,
    },
    {
      id: `c_${dateKey}_firewall`,
      dateKey,
      title: "Défi du jour: Brèche",
      desc: "Remporter 3 Firewall Battles aujourd’hui.",
      kind: { type: "firewallWins", target: 3 },
      reward: { type: "shards", amount: 1 },
      completed: false,
      claimed: false,
    },
  ];

  return [base[pick]];
}
