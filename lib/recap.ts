/**
 * Weekly (and future monthly) recap from existing DB data.
 * No Riot API calls; uses RankSnapshot and MatchParticipant only.
 * Timeframe is parameterized so the same logic can drive monthly recaps.
 */

import { prisma } from "@/lib/db";

const SOLO_QUEUE = "RANKED_SOLO_5x5";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reusable time window for recap (inclusive). */
export interface RecapWindow {
  start: Date;
  end: Date;
}

/** Last N days from now (end = now). */
export function lastNDays(days: number): RecapWindow {
  const end = new Date();
  const start = new Date(end.getTime() - days * MS_PER_DAY);
  return { start, end };
}

/** Per-player stats for the window (used for aggregation). */
export interface PlayerWindowStats {
  playerId: string;
  gameName: string;
  tagLine: string;
  lpChange: number | null; // null if &lt; 2 snapshots in window
  gamesPlayed: number;
  wins: number;
  winrate: number | null; // 0–100, null if no games
  maxWinStreak: number; // longest consecutive wins in window
}

/** One "winner" or highlighted player with value and optional label. */
export interface RecapHighlight {
  playerId: string;
  gameName: string;
  tagLine: string;
  value: number;
  label?: string; // e.g. "+45 LP", "72% WR", "12 games"
}

/** Rough week = most games with bad results; we surface one "fun" candidate. */
export interface RoughWeekCandidate {
  playerId: string;
  gameName: string;
  tagLine: string;
  gamesPlayed: number;
  winrate: number;
  lpChange: number | null;
  reason: string; // short human reason, e.g. "12 games, 25% WR"
}

/** Full weekly (or monthly) recap for the UI. */
export interface WeeklyRecapData {
  window: RecapWindow;
  isWeekly: boolean; // true if 7 days, false for monthly etc.
  biggestLpGainer: RecapHighlight | null;
  biggestLpLoser: RecapHighlight | null;
  bestWinrate: RecapHighlight | null;
  worstWinrate: RecapHighlight | null;
  mostGames: RecapHighlight | null;
  longestWinStreak: RecapHighlight | null;
  roughWeek: RoughWeekCandidate | null;
  /** All per-player stats for the window (for debugging or extra UI). */
  playerStats: PlayerWindowStats[];
}

const MIN_GAMES_FOR_WINRATE = 3;

/**
 * Fetches per-player stats for the given window from DB (no Riot calls).
 */
async function getPlayerStatsForWindow(
  window: RecapWindow,
  queueType: string = SOLO_QUEUE
): Promise<PlayerWindowStats[]> {
  const players = await prisma.trackedPlayer.findMany({
    select: { id: true, gameName: true, tagLine: true },
  });
  if (players.length === 0) return [];

  const playerIds = players.map((p) => p.id);

  const [snapshots, participants] = await Promise.all([
    prisma.rankSnapshot.findMany({
      where: {
        trackedPlayerId: { in: playerIds },
        queueType,
        createdAt: { gte: window.start, lte: window.end },
      },
      orderBy: { createdAt: "asc" },
      select: {
        trackedPlayerId: true,
        leaguePoints: true,
        createdAt: true,
      },
    }),
    prisma.matchParticipant.findMany({
      where: {
        trackedPlayerId: { in: playerIds },
        match: {
          gameStartAt: { gte: window.start, lte: window.end },
        },
      },
      include: { match: { select: { gameStartAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const snapshotsByPlayer = new Map<string, { leaguePoints: number; createdAt: Date }[]>();
  for (const s of snapshots) {
    const list = snapshotsByPlayer.get(s.trackedPlayerId) ?? [];
    list.push({ leaguePoints: s.leaguePoints, createdAt: s.createdAt });
    snapshotsByPlayer.set(s.trackedPlayerId, list);
  }

  const matchesByPlayer = new Map<string, { win: boolean; gameStartAt: Date }[]>();
  for (const p of participants) {
    const list = matchesByPlayer.get(p.trackedPlayerId) ?? [];
    list.push({ win: p.win, gameStartAt: p.match.gameStartAt });
    matchesByPlayer.set(p.trackedPlayerId, list);
  }

  const result: PlayerWindowStats[] = [];

  for (const player of players) {
    const snaps = snapshotsByPlayer.get(player.id) ?? [];
    const matches = (matchesByPlayer.get(player.id) ?? []).sort(
      (a, b) => a.gameStartAt.getTime() - b.gameStartAt.getTime()
    );

    let lpChange: number | null = null;
    if (snaps.length >= 2) {
      lpChange =
        snaps[snaps.length - 1].leaguePoints - snaps[0].leaguePoints;
    }

    const gamesPlayed = matches.length;
    const wins = matches.filter((m) => m.win).length;
    const winrate =
      gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : null;

    let maxWinStreak = 0;
    let current = 0;
    for (const m of matches) {
      if (m.win) {
        current++;
        maxWinStreak = Math.max(maxWinStreak, current);
      } else {
        current = 0;
      }
    }

    result.push({
      playerId: player.id,
      gameName: player.gameName,
      tagLine: player.tagLine,
      lpChange,
      gamesPlayed,
      wins,
      winrate,
      maxWinStreak,
    });
  }

  return result;
}

/**
 * Builds the weekly recap from per-player stats.
 * Handles low sample size: requires min games for winrate highlights, and at least 2 snapshots for LP change.
 */
function buildRecapFromStats(
  playerStats: PlayerWindowStats[],
  window: RecapWindow,
  isWeekly: boolean
): WeeklyRecapData {
  const withLp = playerStats.filter((p) => p.lpChange !== null);
  const withEnoughGames = playerStats.filter(
    (p) => p.gamesPlayed >= MIN_GAMES_FOR_WINRATE && p.winrate !== null
  );

  const biggestLpGainer =
    withLp.length === 0
      ? null
      : (() => {
          const best = withLp.reduce((a, b) =>
            (a.lpChange ?? -Infinity) > (b.lpChange ?? -Infinity) ? a : b
          );
          return {
            playerId: best.playerId,
            gameName: best.gameName,
            tagLine: best.tagLine,
            value: best.lpChange!,
            label: `${best.lpChange! >= 0 ? "+" : ""}${best.lpChange!} LP`,
          };
        })();

  const biggestLpLoser =
    withLp.length === 0
      ? null
      : (() => {
          const worst = withLp.reduce((a, b) =>
            (a.lpChange ?? Infinity) < (b.lpChange ?? Infinity) ? a : b
          );
          return {
            playerId: worst.playerId,
            gameName: worst.gameName,
            tagLine: worst.tagLine,
            value: worst.lpChange!,
            label: `${worst.lpChange! >= 0 ? "+" : ""}${worst.lpChange!} LP`,
          };
        })();

  const bestWinrate =
    withEnoughGames.length === 0
      ? null
      : (() => {
          const best = withEnoughGames.reduce((a, b) =>
            (a.winrate ?? -1) > (b.winrate ?? -1) ? a : b
          );
          return {
            playerId: best.playerId,
            gameName: best.gameName,
            tagLine: best.tagLine,
            value: best.winrate!,
            label: `${best.winrate!.toFixed(1)}% WR`,
          };
        })();

  const worstWinrate =
    withEnoughGames.length === 0
      ? null
      : (() => {
          const worst = withEnoughGames.reduce((a, b) =>
            (a.winrate ?? 101) < (b.winrate ?? 101) ? a : b
          );
          return {
            playerId: worst.playerId,
            gameName: worst.gameName,
            tagLine: worst.tagLine,
            value: worst.winrate!,
            label: `${worst.winrate!.toFixed(1)}% WR`,
          };
        })();

  const withGames = playerStats.filter((p) => p.gamesPlayed > 0);
  const mostGames =
    withGames.length === 0
      ? null
      : (() => {
          const top = withGames.reduce((a, b) =>
            a.gamesPlayed >= b.gamesPlayed ? a : b
          );
          return {
            playerId: top.playerId,
            gameName: top.gameName,
            tagLine: top.tagLine,
            value: top.gamesPlayed,
            label: `${top.gamesPlayed} games`,
          };
        })();

  const withStreak = playerStats.filter((p) => p.maxWinStreak > 0);
  const longestWinStreak =
    withStreak.length === 0
      ? null
      : (() => {
          const top = withStreak.reduce((a, b) =>
            a.maxWinStreak >= b.maxWinStreak ? a : b
          );
          return {
            playerId: top.playerId,
            gameName: top.gameName,
            tagLine: top.tagLine,
            value: top.maxWinStreak,
            label: `${top.maxWinStreak}W streak`,
          };
        })();

  // Rough week: among players with >= MIN_GAMES, pick lowest winrate; tie-break by most games (played a lot and lost a lot).
  let roughWeek: RoughWeekCandidate | null = null;
  if (withEnoughGames.length > 0) {
    const candidate = withEnoughGames.reduce((a, b) => {
      if ((a.winrate ?? 100) !== (b.winrate ?? 100))
        return (a.winrate ?? 100) < (b.winrate ?? 100) ? a : b;
      return a.gamesPlayed >= b.gamesPlayed ? a : b;
    });
    roughWeek = {
      playerId: candidate.playerId,
      gameName: candidate.gameName,
      tagLine: candidate.tagLine,
      gamesPlayed: candidate.gamesPlayed,
      winrate: candidate.winrate!,
      lpChange: candidate.lpChange,
      reason: `${candidate.gamesPlayed} games, ${candidate.winrate!.toFixed(0)}% WR`,
    };
  }

  return {
    window,
    isWeekly,
    biggestLpGainer,
    biggestLpLoser,
    bestWinrate,
    worstWinrate,
    mostGames,
    longestWinStreak,
    roughWeek,
    playerStats,
  };
}

/**
 * Returns the weekly recap (last 7 days) from DB data only.
 */
export async function getWeeklyRecap(): Promise<WeeklyRecapData> {
  const window = lastNDays(7);
  const playerStats = await getPlayerStatsForWindow(window, SOLO_QUEUE);
  return buildRecapFromStats(playerStats, window, true);
}

/**
 * Returns a recap for an arbitrary window (e.g. last 30 days for monthly).
 * Reuses the same logic as weekly for consistent behavior.
 */
export async function getRecapForWindow(
  window: RecapWindow,
  options: { isWeekly?: boolean } = {}
): Promise<WeeklyRecapData> {
  const isWeekly =
    options.isWeekly ??
    (window.end.getTime() - window.start.getTime() <= 8 * MS_PER_DAY);
  const playerStats = await getPlayerStatsForWindow(window, SOLO_QUEUE);
  return buildRecapFromStats(playerStats, window, isWeekly);
}
