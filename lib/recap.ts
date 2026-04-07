/**
 * Weekly (and future monthly) recap from existing DB data.
 * No Riot API calls; uses RankSnapshot and MatchParticipant only.
 * Timeframe is parameterized so the same logic can drive monthly recaps.
 */

import { prisma } from "@/lib/db";
import { isRemake } from "@/lib/derived-stats";
import { getQueueRecommendationForPlayer } from "@/lib/queue-recommendation";
import {
  getPlayerDetail,
  RANKED_QUEUE_ID_BY_TYPE,
  SOLO_QUEUE,
  type RankedQueueType,
} from "@/lib/leaderboard";
import { rankToLadderLp } from "@/lib/rank-utils";
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

/** A single "stinker" game record — worst KDA or most deaths in a game this week. */
export interface StinkerEntry {
  playerId: string;
  gameName: string;
  tagLine: string;
  championName: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kda: number; // (K+A)/max(1,D)
  matchDbId: string;
}

/** Stinker of the Week — worst of the week across all players. */
export interface StinkerOfTheWeek {
  worstKda: StinkerEntry | null;       // lowest single-game KDA
  mostDeaths: StinkerEntry | null;     // most deaths in a single game
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
  stinkerOfTheWeek: StinkerOfTheWeek;
  /** All per-player stats for the window (for debugging or extra UI). */
  playerStats: PlayerWindowStats[];
  /** Optional: per-player queue recommendations for dashboard cards. */
  queueRecommendations?: {
    playerId: string;
    gameName: string;
    tagLine: string;
    label: string;
    score: number;
    badChampionName?: string;
  }[];
}


const MIN_GAMES_FOR_WINRATE = 6;

/**
 * Fetches per-player stats for the given window from DB (no Riot calls).
 */
async function getPlayerStatsForWindow(
  window: RecapWindow,
  queueType: RankedQueueType = SOLO_QUEUE
): Promise<{ playerStats: PlayerWindowStats[]; stinkerOfTheWeek: StinkerOfTheWeek }> {
  const players = await prisma.trackedPlayer.findMany({
    select: { id: true, gameName: true, tagLine: true },
  });
  if (players.length === 0) return { playerStats: [], stinkerOfTheWeek: { worstKda: null, mostDeaths: null } };

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
        tier: true,
        rank: true,
        leaguePoints: true,
        createdAt: true,
      },
    }),
    prisma.matchParticipant.findMany({
      where: {
        trackedPlayerId: { in: playerIds },
        match: {
          gameStartAt: { gte: window.start, lte: window.end },
          queueId: RANKED_QUEUE_ID_BY_TYPE[queueType],
        },
      },
      include: {
        match: {
          select: { gameStartAt: true, gameDuration: true, id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const snapshotsByPlayer = new Map<
    string,
    { tier: string; rank: string; leaguePoints: number; createdAt: Date }[]
  >();
  for (const s of snapshots) {
    const list = snapshotsByPlayer.get(s.trackedPlayerId) ?? [];
    list.push({
      tier: s.tier,
      rank: s.rank,
      leaguePoints: s.leaguePoints,
      createdAt: s.createdAt,
    });
    snapshotsByPlayer.set(s.trackedPlayerId, list);
  }

  const matchesByPlayer = new Map<
    string,
    { win: boolean; gameStartAt: Date; kills: number; deaths: number; assists: number; championName: string | null; gameDuration: number; matchDbId: string }[]
  >();
  for (const p of participants) {
    const list = matchesByPlayer.get(p.trackedPlayerId) ?? [];
    list.push({
      win: p.win,
      gameStartAt: p.match.gameStartAt,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      championName: p.championName,
      gameDuration: p.match.gameDuration,
      matchDbId: p.match.id,
    });
    matchesByPlayer.set(p.trackedPlayerId, list);
  }

  const result: PlayerWindowStats[] = [];

  for (const player of players) {
    const snaps = snapshotsByPlayer.get(player.id) ?? [];
    const matches = (matchesByPlayer.get(player.id) ?? [])
      .filter((m) => !isRemake(m))
      .sort(
      (a, b) => a.gameStartAt.getTime() - b.gameStartAt.getTime()
    );

    let lpChange: number | null = null;
    if (snaps.length >= 2) {
      lpChange = rankToLadderLp({
        tier: snaps[snaps.length - 1].tier,
        rank: snaps[snaps.length - 1].rank,
        leaguePoints: snaps[snaps.length - 1].leaguePoints,
      }) - rankToLadderLp({
        tier: snaps[0].tier,
        rank: snaps[0].rank,
        leaguePoints: snaps[0].leaguePoints,
      });
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

  const stinkerOfTheWeek = computeStinker(players, matchesByPlayer);

  return { playerStats: result, stinkerOfTheWeek };
}


/** Compute Stinker of the Week from all participants across all players in window (no remakes). */
function computeStinker(
  players: { id: string; gameName: string; tagLine: string }[],
  matchesByPlayer: Map<
    string,
    { kills: number; deaths: number; assists: number; championName: string | null; gameDuration: number; matchDbId: string }[]
  >
): StinkerOfTheWeek {
  let worstKda: StinkerEntry | null = null;
  let mostDeaths: StinkerEntry | null = null;

  for (const player of players) {
    const matches = matchesByPlayer.get(player.id) ?? [];
    for (const m of matches) {
      if (isRemake(m)) continue;
      const kda = (m.kills + m.assists) / Math.max(1, m.deaths);

      if (!worstKda || kda < worstKda.kda) {
        worstKda = {
          playerId: player.id,
          gameName: player.gameName,
          tagLine: player.tagLine,
          championName: m.championName,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists,
          kda,
          matchDbId: m.matchDbId,
        };
      }
      if (!mostDeaths || m.deaths > mostDeaths.deaths) {
        mostDeaths = {
          playerId: player.id,
          gameName: player.gameName,
          tagLine: player.tagLine,
          championName: m.championName,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists,
          kda,
          matchDbId: m.matchDbId,
        };
      }
    }
  }

  return { worstKda, mostDeaths };
}


/**
 * Builds the weekly recap from per-player stats.
 * Handles low sample size: requires min games for winrate highlights, and at least 2 snapshots for LP change.
 */
function buildRecapFromStats(
  playerStats: PlayerWindowStats[],
  window: RecapWindow,
  isWeekly: boolean,
  stinkerOfTheWeek: StinkerOfTheWeek
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
    stinkerOfTheWeek,
    playerStats,
  };
}


/**
 * Returns the weekly recap (last 7 days) from DB data only.
 */
export async function getWeeklyRecap(
  queueType: RankedQueueType = SOLO_QUEUE
): Promise<WeeklyRecapData> {
  const window = lastNDays(7);
  const { playerStats, stinkerOfTheWeek } = await getPlayerStatsForWindow(window, queueType);
  const base = buildRecapFromStats(playerStats, window, true, stinkerOfTheWeek);

  // Optional best-effort queue recommendations for all tracked players in this window.
  // We reuse PlayerDetail (DB only, no Riot) so we don't duplicate derived logic.
  const recommendations: WeeklyRecapData["queueRecommendations"] = [];
  
  // Fetch all player details in parallel to avoid N+1 query waterfall
  const details = await Promise.all(
    playerStats.map((p) => getPlayerDetail(p.playerId))
  );

  for (let i = 0; i < playerStats.length; i++) {
    const p = playerStats[i];
    const detail = details[i];
    if (!detail) continue;
    const rec = getQueueRecommendationForPlayer(detail);
    recommendations.push({
      playerId: p.playerId,
      gameName: p.gameName,
      tagLine: p.tagLine,
      label: rec.recommendationLabel,
      score: rec.recommendationScore,
      badChampionName: rec.badChampionName,
    });
  }

  return {
    ...base,
    queueRecommendations: recommendations,
  };
}


/**
 * Returns a recap for an arbitrary window (e.g. last 30 days for monthly).
 * Reuses the same logic as weekly for consistent behavior.
 */
export async function getRecapForWindow(
  window: RecapWindow,
  options: { isWeekly?: boolean; queueType?: RankedQueueType } = {}
): Promise<WeeklyRecapData> {
  const isWeekly =
    options.isWeekly ??
    (window.end.getTime() - window.start.getTime() <= 8 * MS_PER_DAY);
  const queueType = options.queueType ?? SOLO_QUEUE;
  const { playerStats, stinkerOfTheWeek } = await getPlayerStatsForWindow(window, queueType);
  return buildRecapFromStats(playerStats, window, isWeekly, stinkerOfTheWeek);
}

