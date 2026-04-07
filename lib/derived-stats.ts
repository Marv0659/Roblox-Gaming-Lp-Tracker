/**
 * Derived stats layer: computes advanced player metrics from existing DB data.
 * All functions are pure and composable; no Prisma or Riot calls.
 * Guards for missing or low-sample data; safe to extend.
 */

import { rankToLadderLp } from "@/lib/rank-utils";

// ---- Input types (minimal shapes; callers map from Prisma) ----

export interface RankSnapshotInput {
  queueType: string;
  tier?: string;
  rank?: string;
  leaguePoints: number;
  createdAt: Date;
}

export interface MatchParticipantInput {
  win: boolean;
  championName: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gameStartAt: Date;
  /** Game duration in seconds. Used to detect remakes (< REMAKE_THRESHOLD_SECONDS). */
  gameDuration: number;
}


export interface DerivedStatsInput {
  rankSnapshots: RankSnapshotInput[];
  matches: MatchParticipantInput[];
}

// ---- Output types ----

export interface ChampionWinrateStat {
  championName: string;
  games: number;
  wins: number;
  winrate: number;
}

export interface DerivedPlayerStats {
  lpGained7d: number;
  lpGained30d: number;
  winrateLast10: number | null;
  winrateLast20: number | null;
  currentWinStreak: number;
  currentLossStreak: number;
  mostPlayedChampion: string | null;
  bestChampionByWinrate: ChampionWinrateStat | null;
  worstChampionByWinrate: ChampionWinrateStat | null;
  totalGamesLast7d: number;
  averageKda: number | null;
}

// ---- Constants ----

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_MIN_GAMES_CHAMPION_WINRATE = 3;

/**
 * Games shorter than this (in seconds) are remakes.
 * Riot does not award LP and stats are meaningless.
 */
export const REMAKE_THRESHOLD_SECONDS = 210;

/** Returns true if a match should be treated as a remake. */
export function isRemake(match: Pick<MatchParticipantInput, "gameDuration">): boolean {
  return match.gameDuration < REMAKE_THRESHOLD_SECONDS;
}

/** Filters out remake games from a match list. */
export function withoutRemakes(matches: MatchParticipantInput[]): MatchParticipantInput[] {
  return matches.filter((m) => !isRemake(m));
}


/** Date N days ago from now. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MS_PER_DAY);
}

// ---- LP from snapshots ----

/**
 * LP gained in a time window for a given queue (e.g. solo).
 * Uses oldest and newest snapshot in window; returns 0 if &lt; 2 snapshots.
 */
export function lpGainedInWindow(
  snapshots: RankSnapshotInput[],
  queueType: string,
  since: Date
): number {
  const inWindow = snapshots
    .filter((s) => s.queueType === queueType && s.createdAt.getTime() >= since.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (inWindow.length < 2) return 0;

  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const hasRankMeta =
    typeof first.tier === "string" &&
    typeof first.rank === "string" &&
    typeof last.tier === "string" &&
    typeof last.rank === "string";

  if (!hasRankMeta) {
    return last.leaguePoints - first.leaguePoints;
  }

  return rankToLadderLp(last) - rankToLadderLp(first);
}

// ---- Winrate in last N games ----

/** Winrate (0–100) in the last N games; null if no games. */
export function winrateLastN(
  matches: MatchParticipantInput[],
  n: number
): number | null {
  const slice = matches.slice(0, n);
  if (slice.length === 0) return null;
  const wins = slice.filter((m) => m.win).length;
  return (wins / slice.length) * 100;
}

// ---- Streaks ----

/** Current win streak (consecutive wins from most recent game). 0 if not on a win streak. */
export function currentWinStreak(matches: MatchParticipantInput[]): number {
  if (matches.length === 0) return 0;
  let count = 0;
  for (const m of matches) {
    if (m.win) count++;
    else break;
  }
  return count;
}

/** Current loss streak (consecutive losses from most recent game). 0 if not on a loss streak. */
export function currentLossStreak(matches: MatchParticipantInput[]): number {
  if (matches.length === 0) return 0;
  let count = 0;
  for (const m of matches) {
    if (!m.win) count++;
    else break;
  }
  return count;
}

// ---- Champion stats ----

export interface ChampionAggregate {
  games: number;
  wins: number;
}

/**
 * Aggregates per-champion games and wins from matches.
 * Champion name normalized: null/empty → "Unknown".
 */
export function computeChampionStats(
  matches: MatchParticipantInput[]
): Map<string, ChampionAggregate> {
  const map = new Map<string, ChampionAggregate>();
  for (const m of matches) {
    const name = (m.championName?.trim() && m.championName) || "Unknown";
    const cur = map.get(name) ?? { games: 0, wins: 0 };
    cur.games += 1;
    if (m.win) cur.wins += 1;
    map.set(name, cur);
  }
  return map;
}

/** Most played champion; null if no matches. */
export function getMostPlayedChampion(
  champStats: Map<string, ChampionAggregate>
): string | null {
  let best: string | null = null;
  let bestGames = 0;
  for (const [name, s] of champStats.entries()) {
    if (s.games > bestGames) {
      bestGames = s.games;
      best = name;
    }
  }
  return best;
}

/**
 * Best champion by winrate among those with >= minGames.
 * Tie-break: more games. Returns null if none qualify.
 */
export function getBestChampionByWinrate(
  champStats: Map<string, ChampionAggregate>,
  minGames: number = DEFAULT_MIN_GAMES_CHAMPION_WINRATE
): ChampionWinrateStat | null {
  let best: ChampionWinrateStat | null = null;
  for (const [name, s] of champStats.entries()) {
    if (s.games < minGames) continue;
    const winrate = (s.wins / s.games) * 100;
    if (
      !best ||
      winrate > best.winrate ||
      (Math.abs(winrate - best.winrate) < 1e-9 && s.games > best.games)
    ) {
      best = { championName: name, games: s.games, wins: s.wins, winrate };
    }
  }
  return best;
}

/**
 * Worst champion by winrate among those with >= minGames.
 * Tie-break: more games (so we prefer "meaningful" worst). Returns null if none qualify.
 */
export function getWorstChampionByWinrate(
  champStats: Map<string, ChampionAggregate>,
  minGames: number = DEFAULT_MIN_GAMES_CHAMPION_WINRATE
): ChampionWinrateStat | null {
  let worst: ChampionWinrateStat | null = null;
  for (const [name, s] of champStats.entries()) {
    if (s.games < minGames) continue;
    const winrate = (s.wins / s.games) * 100;
    if (
      !worst ||
      winrate < worst.winrate ||
      (Math.abs(winrate - worst.winrate) < 1e-9 && s.games > worst.games)
    ) {
      worst = { championName: name, games: s.games, wins: s.wins, winrate };
    }
  }
  return worst;
}

// ---- Games in window ----

/** Count matches with gameStartAt >= since. */
export function totalGamesInWindow(
  matches: MatchParticipantInput[],
  since: Date
): number {
  const t = since.getTime();
  return matches.filter((m) => m.gameStartAt.getTime() >= t).length;
}

// ---- KDA ----

/**
 * Average KDA over the last n games: (kills + assists) / max(1, deaths) per game, then averaged.
 * null if no games.
 */
export function averageKda(
  matches: MatchParticipantInput[],
  n: number = 20
): number | null {
  const slice = matches.slice(0, n);
  if (slice.length === 0) return null;
  const sum = slice.reduce((acc, m) => {
    const deaths = m.deaths > 0 ? m.deaths : 1;
    return acc + (m.kills + m.assists) / deaths;
  }, 0);
  return sum / slice.length;
}

// ---- One-shot composer ----

const SOLO_QUEUE = "RANKED_SOLO_5x5";

/**
 * Computes all derived player stats from snapshots and matches.
 * Uses sensible defaults and guards; safe with empty arrays.
 */
export function computeDerivedPlayerStats(
  input: DerivedStatsInput,
  options: {
    queueType?: string;
    minGamesChampionWinrate?: number;
    kdaGameCount?: number;
  } = {}
): DerivedPlayerStats {
  const {
    queueType = SOLO_QUEUE,
    minGamesChampionWinrate = DEFAULT_MIN_GAMES_CHAMPION_WINRATE,
    kdaGameCount = 20,
  } = options;

  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  const lpGained7d = lpGainedInWindow(
    input.rankSnapshots,
    queueType,
    since7d
  );
  const lpGained30d = lpGainedInWindow(
    input.rankSnapshots,
    queueType,
    since30d
  );

  const matches = withoutRemakes(input.matches);

  const winrateLast10 = winrateLastN(matches, 10);
  const winrateLast20 = winrateLastN(matches, 20);

  const winStreak = currentWinStreak(matches);
  const lossStreak = currentLossStreak(matches);

  const champStats = computeChampionStats(matches);
  const mostPlayedChampion = getMostPlayedChampion(champStats);
  const bestChampionByWinrate = getBestChampionByWinrate(
    champStats,
    minGamesChampionWinrate
  );
  const worstChampionByWinrate = getWorstChampionByWinrate(
    champStats,
    minGamesChampionWinrate
  );

  const totalGamesLast7d = totalGamesInWindow(matches, since7d);
  const avgKda = averageKda(matches, kdaGameCount);

  return {
    lpGained7d,
    lpGained30d,
    winrateLast10,
    winrateLast20,
    currentWinStreak: winStreak,
    currentLossStreak: lossStreak,
    mostPlayedChampion,
    bestChampionByWinrate,
    worstChampionByWinrate,
    totalGamesLast7d,
    averageKda: avgKda,
  };
}
