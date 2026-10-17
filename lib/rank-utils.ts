/**
 * Rank comparison utility: tier/rank to comparable score, promotion/demotion detection.
 * Kept in sync with leaderboard tier/rank order for consistent sorting and event detection.
 */

export interface RankLike {
  tier: string;
  rank: string;
  leaguePoints?: number;
}

const LP_PER_DIVISION = 100;
const DIVISIONS_PER_TIER = 4;
const LP_PER_TIER = LP_PER_DIVISION * DIVISIONS_PER_TIER;

// Tier order (lowest = worst). Matches leaderboard.ts.
const TIER_ORDER: Record<string, number> = {
  IRON: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  EMERALD: 5,
  DIAMOND: 6,
  MASTER: 7,
  GRANDMASTER: 8,
  CHALLENGER: 9,
};

// Division order (IV = worst, I = best; empty for Master+).
const RANK_ORDER: Record<string, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
  "": 4, // Master+ has no division
};

/**
 * Converts tier/division/LP to a continuous ladder value.
 * Each division spans 100 points so promotions don't look like large drops.
 */
export function rankToLadderLp(r: RankLike): number {
  const tier = (r.tier ?? "").toUpperCase();
  const rank = (r.rank ?? "").toUpperCase();
  const tierIndex = TIER_ORDER[tier] ?? -1;
  const rawLp = Math.max(0, r.leaguePoints ?? 0);

  if (tierIndex < 0) return rawLp;
  // Master, Grandmaster and Challenger share one uncapped LP ladder (GM/Chall are LP cutoffs).
  if (tierIndex >= TIER_ORDER.MASTER) return TIER_ORDER.MASTER * LP_PER_TIER + rawLp;

  const lp = Math.min(100, rawLp);
  const divisionIndex = rank in RANK_ORDER ? RANK_ORDER[rank]! : 0;
  const normalizedDivision = Math.max(0, Math.min(3, divisionIndex));

  return tierIndex * LP_PER_TIER + normalizedDivision * LP_PER_DIVISION + lp;
}

/**
 * Converts tier + rank + optional LP into a single comparable score.
 * Higher score = better rank. Use for sorting and "is this a new peak?" checks.
 */
export function rankToScore(r: RankLike): number {
  const t = TIER_ORDER[r.tier] ?? -1;
  const div = RANK_ORDER[r.rank] ?? -1;
  const lp = r.leaguePoints ?? 0;
  return t * 100_000 + div * 1_000 + lp;
}

export type RankComparison = "higher" | "lower" | "same";

/**
 * Compares two ranks. Returns whether "to" is higher, lower, or same as "from".
 */
export function compareRanks(from: RankLike, to: RankLike): RankComparison {
  const fromScore = rankToScore(from);
  const toScore = rankToScore(to);
  if (toScore > fromScore) return "higher";
  if (toScore < fromScore) return "lower";
  return "same";
}

/** Tier + division only: LP changes inside a division are neither promotion nor demotion. */
function divisionOnly(r: RankLike): RankLike {
  return { tier: r.tier, rank: r.rank };
}

/** True if "to" is in a better division/tier than "from" (promotion). */
export function isPromotion(from: RankLike, to: RankLike): boolean {
  return compareRanks(divisionOnly(from), divisionOnly(to)) === "higher";
}

/** True if "to" is in a worse division/tier than "from" (demotion). */
export function isDemotion(from: RankLike, to: RankLike): boolean {
  return compareRanks(divisionOnly(from), divisionOnly(to)) === "lower";
}

/** True if rank (tier+division) is unchanged; LP may differ. */
export function isSameRank(from: RankLike, to: RankLike): boolean {
  return from.tier === to.tier && from.rank === to.rank;
}

/** LP change between two ranks on the continuous ladder (promotions/demotions included). */
export function lpDiff(from: RankLike, to: RankLike): number {
  return rankToLadderLp(to) - rankToLadderLp(from);
}

const APEX_TIERS = ["MASTER", "GRANDMASTER", "CHALLENGER"];
const TIER_BY_INDEX = Object.keys(TIER_ORDER);
const DIVISION_BY_INDEX = ["IV", "III", "II", "I"];

/** "DIAMOND", "IV" → "Diamond IV"; apex tiers drop the division. */
export function prettyTier(tier: string, rank?: string | null): string {
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  return APEX_TIERS.includes(tier) || !rank ? t : `${t} ${rank}`;
}

/** Short label for a ladder value at a division boundary, e.g. 2400 → "D IV", 2800 → "Master". */
export function ladderLpLabel(value: number): string {
  const tierIndex = Math.floor(value / LP_PER_TIER);
  if (tierIndex >= TIER_ORDER.MASTER) {
    const lp = value - TIER_ORDER.MASTER * LP_PER_TIER;
    return lp > 0 ? `Master+ ${lp}` : "Master";
  }
  const tier = TIER_BY_INDEX[tierIndex];
  if (!tier) return String(value);
  const division = DIVISION_BY_INDEX[Math.floor((value % LP_PER_TIER) / LP_PER_DIVISION)];
  return `${tier.charAt(0)} ${division}`;
}
