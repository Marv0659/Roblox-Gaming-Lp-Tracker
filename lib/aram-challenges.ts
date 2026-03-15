/**
 * ARAM God challenge definitions and progress computation.
 *
 * Challenge IDs sourced from community research (aramgod.com, Riot API responses).
 * The master title "ARAM God" requires MASTER tier in challenge 602001 (ARAM Authority).
 *
 * Structure:
 *   ARAM Authority (602001)  ← meta
 *     ARAM Warrior  (602002) ← sub-group
 *     ARAM Finesse  (602003) ← sub-group
 *     ARAM Champion (602004) ← sub-group
 *
 * Individual challenges roll up into these groups.
 */

import type { PlayerChallengeDataDto } from "@/types/riot";

// Tier ordering (index = numeric weight, higher = better)
export const TIER_ORDER = [
  "NONE",
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
] as const;

export type ChallengeTier = (typeof TIER_ORDER)[number];

export interface AramChallengeDefinition {
  id: number;
  name: string;
  description: string;
  group: "meta" | "WARRIOR" | "FINESSE" | "CHAMPION";
  /** Numeric thresholds per tier (in order: IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER) */
  thresholds: number[];
}

/** Thresholds are [IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER] */
export const ARAM_CHALLENGES: AramChallengeDefinition[] = [
  // ── Meta / Group challenges ──────────────────────────────────────────────
  {
    id: 602001,
    name: "ARAM Authority",
    description:
      "Complete ARAM Warrior, ARAM Finesse, and ARAM Champion challenges to earn the ARAM God title.",
    group: "meta",
    thresholds: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000],
  },
  {
    id: 602002,
    name: "ARAM Warrior",
    description: "Complete ARAM challenges focused on dealing damage and securing kills.",
    group: "WARRIOR",
    thresholds: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  },
  {
    id: 602003,
    name: "ARAM Finesse",
    description: "Complete ARAM challenges focused on skillful play and team utility.",
    group: "FINESSE",
    thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  },
  {
    id: 602004,
    name: "ARAM Champion",
    description: "Complete ARAM challenges focused on champion variety and objectives.",
    group: "CHAMPION",
    thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  },

  // ── ARAM Warrior sub-challenges ─────────────────────────────────────────
  {
    id: 401106,
    name: "ARAM Eradication",
    description: "Get Pentakills in ARAM.",
    group: "WARRIOR",
    thresholds: [1, 2, 5, 10, 15, 25, 40, 60, 80, 100],
  },
  {
    id: 401101,
    name: "Bad Medicine",
    description: "Kill opponents who recently received a health pack in ARAM.",
    group: "WARRIOR",
    thresholds: [5, 15, 30, 60, 100, 150, 200, 300, 400, 500],
  },
  {
    id: 401102,
    name: "Farm Champs Not Minions",
    description: "Get Takedowns in ARAM. Your champion count must be higher than your minion count.",
    group: "WARRIOR",
    thresholds: [10, 30, 60, 100, 150, 200, 350, 500, 700, 1000],
  },
  {
    id: 401105,
    name: "Double Decimation",
    description: "Achieve two or more Pentakills in a single ARAM game.",
    group: "WARRIOR",
    thresholds: [1, 2, 3, 5, 8, 12, 18, 25, 35, 50],
  },

  // ── ARAM Finesse sub-challenges ─────────────────────────────────────────
  {
    id: 401103,
    name: "No Hiding",
    description: "Kill enemies who are near one of their own turrets while you have a kill in ARAM.",
    group: "FINESSE",
    thresholds: [5, 15, 30, 60, 100, 150, 200, 300, 400, 500],
  },
  {
    id: 401104,
    name: "Solo Carry",
    description: "Deal 40% or more of your team's total damage to champions in an ARAM game.",
    group: "FINESSE",
    thresholds: [1, 5, 10, 20, 35, 55, 80, 110, 150, 200],
  },
  {
    id: 401107,
    name: "Snow Day",
    description: "Hit enemy champions with snowballs in ARAM.",
    group: "FINESSE",
    thresholds: [5, 20, 50, 100, 175, 275, 400, 550, 750, 1000],
  },

  // ── ARAM Champion sub-challenges ────────────────────────────────────────
  {
    id: 401108,
    name: "Rapid Demolition",
    description: "Destroy the first enemy turret before 5 minutes in ARAM.",
    group: "CHAMPION",
    thresholds: [1, 3, 6, 12, 20, 30, 45, 65, 90, 120],
  },
  {
    id: 401109,
    name: "All Random All Champs",
    description: "Earn an S- grade or higher on different champions in ARAM.",
    group: "CHAMPION",
    thresholds: [5, 15, 30, 50, 75, 100, 130, 160, 200, 250],
  },
];

// IDs we care about keyed for fast lookup
const ARAM_IDS = new Set(ARAM_CHALLENGES.map((c) => c.id));

export interface AramChallengeProgress {
  definition: AramChallengeDefinition;
  /** Current numeric value from the API (0 if missing) */
  value: number;
  /** Current tier label */
  level: ChallengeTier;
  /** Percentile rank among all players (0-1, or null if missing) */
  percentile: number | null;
  /** True if at least MASTER tier */
  completed: boolean;
  /** Threshold needed for next tier (null if already at max) */
  nextThreshold: number | null;
  /** Current tier index (0=NONE … 9=CHALLENGER) */
  tierIndex: number;
}

function tierIndex(level: string): number {
  const idx = TIER_ORDER.indexOf(level as ChallengeTier);
  return idx === -1 ? 0 : idx;
}

/**
 * Maps raw Riot challenge data onto ARAM challenge definitions,
 * computing progress metadata for each one.
 */
export function getAramChallengeProgress(
  data: PlayerChallengeDataDto | null
): AramChallengeProgress[] {
  const byId = new Map<number, { value: number; level: string; percentile: number }>();
  if (data) {
    for (const c of data.challenges) {
      if (ARAM_IDS.has(c.challengeId)) {
        byId.set(c.challengeId, {
          value: c.value,
          level: c.level,
          percentile: c.percentile,
        });
      }
    }
  }

  return ARAM_CHALLENGES.map((def) => {
    const entry = byId.get(def.id);
    const value = entry?.value ?? 0;
    const level = (entry?.level ?? "NONE") as ChallengeTier;
    const tIdx = tierIndex(level);
    const completed = tIdx >= tierIndex("MASTER");

    // Next tier threshold: thresholds array maps index 0 = IRON … 9 = CHALLENGER
    // Current tier = tIdx, so next is tIdx (0-based in thresholds array = tIdx since NONE=0)
    // thresholds[0]=IRON means to reach IRON you need thresholds[0]
    const nextThreshold =
      tIdx < def.thresholds.length ? def.thresholds[tIdx] : null;

    return {
      definition: def,
      value,
      level,
      percentile: entry?.percentile ?? null,
      completed,
      nextThreshold,
      tierIndex: tIdx,
    };
  });
}

/** Separate progress list by group */
export function groupAramProgress(progress: AramChallengeProgress[]) {
  return {
    meta: progress.filter((p) => p.definition.group === "meta"),
    warrior: progress.filter((p) => p.definition.group === "WARRIOR" && p.definition.id !== 602002),
    finesse: progress.filter((p) => p.definition.group === "FINESSE" && p.definition.id !== 602003),
    champion: progress.filter((p) => p.definition.group === "CHAMPION" && p.definition.id !== 602004),
    warriorGroup: progress.find((p) => p.definition.id === 602002) ?? null,
    finesseGroup: progress.find((p) => p.definition.id === 602003) ?? null,
    championGroup: progress.find((p) => p.definition.id === 602004) ?? null,
    authority: progress.find((p) => p.definition.id === 602001) ?? null,
  };
}

/** Tier display colour class */
export function tierColorClass(level: ChallengeTier | string): string {
  switch (level) {
    case "IRON":        return "text-stone-400";
    case "BRONZE":      return "text-amber-700";
    case "SILVER":      return "text-slate-300";
    case "GOLD":        return "text-yellow-400";
    case "PLATINUM":    return "text-teal-400";
    case "EMERALD":     return "text-emerald-400";
    case "DIAMOND":     return "text-blue-400";
    case "MASTER":      return "text-purple-400";
    case "GRANDMASTER": return "text-rose-400";
    case "CHALLENGER":  return "text-yellow-300";
    default:            return "text-muted-foreground";
  }
}
