/**
 * LP history and delta derivation from rank snapshots and matches.
 * Pure logic where possible; no Prisma or Riot calls.
 * Use for: LP charts, recent LP feed, profile pages, leaderboard stats.
 */

import { rankToLadderLp } from "@/lib/rank-utils";

// ---- Input types (minimal; callers map from Prisma) ----

export interface SnapshotLike {
  id?: string;
  createdAt: Date;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface MatchLike {
  gameStartAt: Date;
}

// ---- Delta between consecutive snapshots ----

export type LpAttribution =
  | "single_match"   // Exactly one match between snapshots; LP delta can be attributed to it
  | "interval";      // Multiple matches (or zero) between snapshots; delta covers an interval

export interface SnapshotDelta {
  /** Snapshot before the change. */
  from: SnapshotLike;
  /** Snapshot after the change. */
  to: SnapshotLike;
  lpDelta: number;
  winsDelta: number;
  lossesDelta: number;
  /** Time between snapshots in milliseconds. */
  timeMs: number;
  /** Number of ranked matches with gameStartAt in (from.createdAt, to.createdAt]. */
  matchesInBetween: number;
  /** Whether we can attribute this delta to a single match. */
  attribution: LpAttribution;
}

/**
 * Compares two snapshots for meaningful change (tier, rank, LP, wins, losses).
 * Use when deciding whether to store a new snapshot after sync.
 */
export function snapshotMeaningfullyChanged(
  latest: SnapshotLike | null,
  incoming: { tier: string; rank: string; leaguePoints: number; wins: number; losses: number }
): boolean {
  if (!latest) return true;
  return (
    latest.tier !== incoming.tier ||
    latest.rank !== incoming.rank ||
    latest.leaguePoints !== incoming.leaguePoints ||
    latest.wins !== incoming.wins ||
    latest.losses !== incoming.losses
  );
}

/**
 * Derives deltas between consecutive snapshots for a queue.
 * Snapshots must be sorted by createdAt asc for the same queue.
 */
export function deriveSnapshotDeltas(
  snapshots: SnapshotLike[],
  queueType: string
): SnapshotDelta[] {
  const filtered = snapshots
    .filter((s) => s.queueType === queueType)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const deltas: SnapshotDelta[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const from = filtered[i - 1];
    const to = filtered[i];
    deltas.push({
      from,
      to,
      lpDelta: rankToLadderLp({
        tier: to.tier,
        rank: to.rank,
        leaguePoints: to.leaguePoints,
      }) - rankToLadderLp({
        tier: from.tier,
        rank: from.rank,
        leaguePoints: from.leaguePoints,
      }),
      winsDelta: to.wins - from.wins,
      lossesDelta: to.losses - from.losses,
      timeMs: to.createdAt.getTime() - from.createdAt.getTime(),
      matchesInBetween: 0, // Filled by associateMatchesWithDeltas
      attribution: "interval",
    });
  }
  return deltas;
}

/**
 * Fills matchesInBetween and attribution for each delta.
 * Matches are assumed sorted by gameStartAt desc (newest first); we count matches with
 * from.createdAt < gameStartAt <= to.createdAt.
 */
export function associateMatchesWithDeltas(
  deltas: SnapshotDelta[],
  matches: MatchLike[]
): void {
  const matchTimes = matches.map((m) => m.gameStartAt.getTime());
  for (const d of deltas) {
    const fromT = d.from.createdAt.getTime();
    const toT = d.to.createdAt.getTime();
    const inBetween = matchTimes.filter((t) => t > fromT && t <= toT).length;
    d.matchesInBetween = inBetween;
    d.attribution = inBetween === 1 ? "single_match" : "interval";
  }
}

// ---- Profile-ready LP history entry ----

export interface LpHistoryEntry {
  /** Snapshot timestamp. */
  at: Date;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  /** LP change from previous snapshot; null for the first. */
  lpDelta: number | null;
  winsDelta: number | null;
  lossesDelta: number | null;
  /** Matches between this and the previous snapshot. */
  matchesInBetween: number;
  /** single_match = delta can be attributed to one game; interval = multiple games or unknown. */
  attribution: LpAttribution;
}

/**
 * Builds LP history for a player: each snapshot with delta from previous and match summary.
 * Snapshots and matches are for one queue; matches sorted by gameStartAt desc (newest first).
 */
export function buildLpHistory(
  snapshots: SnapshotLike[],
  matches: MatchLike[],
  queueType: string
): LpHistoryEntry[] {
  const deltas = deriveSnapshotDeltas(snapshots, queueType);
  associateMatchesWithDeltas(deltas, matches);

  const filtered = snapshots
    .filter((s) => s.queueType === queueType)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const entries: LpHistoryEntry[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const snap = filtered[i];
    const delta = i > 0 ? deltas[i - 1] : null;
    entries.push({
      at: snap.createdAt,
      tier: snap.tier,
      rank: snap.rank,
      leaguePoints: snap.leaguePoints,
      wins: snap.wins,
      losses: snap.losses,
      lpDelta: delta ? delta.lpDelta : null,
      winsDelta: delta ? delta.winsDelta : null,
      lossesDelta: delta ? delta.lossesDelta : null,
      matchesInBetween: delta ? delta.matchesInBetween : 0,
      attribution: delta ? delta.attribution : "interval",
    });
  }
  return entries;
}

// ---- Leaderboard-ready derived stats (from DB data only) ----

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * LP gained in the last 7 days from consecutive snapshots.
 * Uses deltas whose midpoint falls within the window; sums lpDelta.
 */
export function getLpGainedLast7d(
  deltas: SnapshotDelta[],
  now: Date = new Date()
): number {
  const cutoff = now.getTime() - MS_7_DAYS;
  return deltas
    .filter((d) => d.to.createdAt.getTime() >= cutoff)
    .reduce((sum, d) => sum + d.lpDelta, 0);
}

/**
 * LP gained in the last 30 days from consecutive snapshots.
 */
export function getLpGainedLast30d(
  deltas: SnapshotDelta[],
  now: Date = new Date()
): number {
  const cutoff = now.getTime() - MS_30_DAYS;
  return deltas
    .filter((d) => d.to.createdAt.getTime() >= cutoff)
    .reduce((sum, d) => sum + d.lpDelta, 0);
}

/**
 * Biggest single interval climb (max positive lpDelta) in the last 30 days.
 * Returns the LP value; 0 if no climb.
 */
export function getBiggestClimb(
  deltas: SnapshotDelta[],
  now: Date = new Date()
): number {
  const cutoff = now.getTime() - MS_30_DAYS;
  let max = 0;
  for (const d of deltas) {
    if (d.to.createdAt.getTime() >= cutoff && d.lpDelta > max) max = d.lpDelta;
  }
  return max;
}

/**
 * Biggest single interval drop (max absolute value of negative lpDelta) in the last 30 days.
 * Returns a negative number (e.g. -45); 0 if no drop.
 */
export function getBiggestDrop(
  deltas: SnapshotDelta[],
  now: Date = new Date()
): number {
  const cutoff = now.getTime() - MS_30_DAYS;
  let min = 0;
  for (const d of deltas) {
    if (d.to.createdAt.getTime() >= cutoff && d.lpDelta < min) min = d.lpDelta;
  }
  return min;
}
