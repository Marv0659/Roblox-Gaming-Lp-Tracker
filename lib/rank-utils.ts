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
  const lp = Math.max(0, Math.min(100, r.leaguePoints ?? 0));

  if (tierIndex < 0) return lp;

  const divisionIndex = rank in RANK_ORDER ? RANK_ORDER[rank]! : 0;
  // Master+ has no visible division; treat as top division within tier.
  const normalizedDivision = tierIndex >= TIER_ORDER.MASTER ? DIVISIONS_PER_TIER : Math.max(0, Math.min(3, divisionIndex));

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

/** True if "to" is a better rank than "from" (promotion). */
export function isPromotion(from: RankLike, to: RankLike): boolean {
  return compareRanks(from, to) === "higher";
}

/** True if "to" is a worse rank than "from" (demotion). */
export function isDemotion(from: RankLike, to: RankLike): boolean {
  return compareRanks(from, to) === "lower";
}

/** True if rank (tier+division) is unchanged; LP may differ. */
export function isSameRank(from: RankLike, to: RankLike): boolean {
  return from.tier === to.tier && from.rank === to.rank;
}
