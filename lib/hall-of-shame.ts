/**
 * Hall of shame / fraud index: data-driven but humorous "worst of" rankings.
 * Uses existing synced DB data only. Reuses derived-stats utilities where possible.
 * All thresholds are tunable via the constants below.
 */

import { prisma } from "@/lib/db";
import {
  daysAgo,
  lpGainedInWindow,
  winrateLastN,
  computeChampionStats,
  totalGamesInWindow,
  withoutRemakes,
  type RankSnapshotInput,
  type MatchParticipantInput,
} from "@/lib/derived-stats";


const SOLO_QUEUE = "RANKED_SOLO_5x5";

// ============== Tune these thresholds ==============
/** Window for "last 7 days" LP loss and spam. */
const WINDOW_7D_DAYS = 7;
/** Window for "recent peak" LP (look back this many days for max LP). */
const WINDOW_PEAK_DAYS = 30;
/** Min rank snapshots in 7d window to qualify for LP loss / drop from peak. */
const MIN_SNAPSHOTS_FOR_LP = 2;
/** Min games to qualify for "worst winrate" and "most deaths per game". */
const MIN_GAMES_FOR_WINRATE_OR_DEATHS = 5;
/** Number of "recent" games for winrate and deaths. */
const RECENT_GAMES_N = 20;
/** Min games in last 7d to qualify for "games spammed with poor results". */
const MIN_GAMES_FOR_SPAM = 3;
/** Winrate below this in 7d = "poor results" for spam. (0–100) */
const WINRATE_POOR_THRESHOLD = 40;
/** Min games on a champion to count for "stubbornness" (low WR champ). */
const MIN_GAMES_FOR_STUBBORN_CHAMP = 4;
/** Champion winrate below this = "stubborn" pick. (0–100) */
const CHAMP_WINRATE_STUBBORN_THRESHOLD = 45;
// ==================================================

export interface HallOfShamePlayer {
  id: string;
  gameName: string;
  tagLine: string;
}

/** One row in a category: player + value + optional label for display. */
export interface HallOfShameEntry {
  player: HallOfShamePlayer;
  value: number;
  label: string;
  /** Extra context (e.g. champion name for stubbornness). */
  detail?: string;
}

export interface HallOfShameResult {
  /** Biggest LP loss in last 7 days (most negative first). */
  biggestLpLoss7d: HallOfShameEntry[];
  /** Worst winrate in recent N games (lowest first). */
  worstRecentWinrate: HallOfShameEntry[];
  /** Most deaths per game recently (highest first). */
  mostDeathsPerGame: HallOfShameEntry[];
  /** Most games in last 7d with poor winrate (spam + bad results). */
  mostGamesSpammedPoorResults: HallOfShameEntry[];
  /** Biggest drop from recent peak LP (highest drop first). */
  biggestDropFromPeak: HallOfShameEntry[];
  /** Worst champion stubbornness: kept playing a low-WR champ (stubbornness score first). */
  worstChampionStubbornness: HallOfShameEntry[];
}

export interface PlayerHallOfShameInput {
  id: string;
  gameName: string;
  tagLine: string;
  rankSnapshots: RankSnapshotInput[];
  matches: MatchParticipantInput[];
}

/** Average deaths per game over last N games; null if fewer than min games. */
function averageDeathsLastN(
  matches: MatchParticipantInput[],
  n: number,
  minGames: number
): number | null {
  const slice = matches.slice(0, n);
  if (slice.length < minGames) return null;
  const total = slice.reduce((acc, m) => acc + m.deaths, 0);
  return total / slice.length;
}

/** Winrate in a time window (0–100). Null if no games in window. */
function winrateInWindow(
  matches: MatchParticipantInput[],
  since: Date
): number | null {
  const inWindow = matches.filter((m) => m.gameStartAt.getTime() >= since.getTime());
  if (inWindow.length === 0) return null;
  const wins = inWindow.filter((m) => m.win).length;
  return (wins / inWindow.length) * 100;
}

/** Drop from peak LP in window: max LP in window minus latest LP. Null if &lt; 2 snapshots. */
function dropFromPeakInWindow(
  snapshots: RankSnapshotInput[],
  queueType: string,
  since: Date
): number | null {
  const inWindow = snapshots
    .filter((s) => s.queueType === queueType && s.createdAt.getTime() >= since.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (inWindow.length < MIN_SNAPSHOTS_FOR_LP) return null;
  const maxLp = Math.max(...inWindow.map((s) => s.leaguePoints));
  const latestLp = inWindow[inWindow.length - 1].leaguePoints;
  const drop = maxLp - latestLp;
  return drop > 0 ? drop : null;
}

/**
 * Stubbornness: worst champ by (games played when WR &lt; threshold). Score = games on that champ.
 * Returns { score, championName, games, winrate } or null if no champ qualifies.
 */
function worstChampionStubbornness(
  matches: MatchParticipantInput[],
  minGames: number,
  maxWinrate: number
): { score: number; championName: string; games: number; winrate: number } | null {
  const champStats = computeChampionStats(matches);
  let best: { score: number; championName: string; games: number; winrate: number } | null = null;
  for (const [name, s] of champStats.entries()) {
    if (s.games < minGames) continue;
    const wr = (s.wins / s.games) * 100;
    if (wr > maxWinrate) continue;
    // Score = games (more games on bad champ = more stubborn)
    if (!best || s.games > best.score || (s.games === best.score && wr < best.winrate)) {
      best = { score: s.games, championName: name, games: s.games, winrate: wr };
    }
  }
  return best;
}

/**
 * Computes all hall-of-shame categories from per-player inputs.
 * Pure function; no DB access.
 */
export function computeHallOfShame(
  players: PlayerHallOfShameInput[]
): HallOfShameResult {
  const since7d = daysAgo(WINDOW_7D_DAYS);
  const sincePeak = daysAgo(WINDOW_PEAK_DAYS);

  const biggestLpLoss7d: HallOfShameEntry[] = [];
  const worstRecentWinrate: HallOfShameEntry[] = [];
  const mostDeathsPerGame: HallOfShameEntry[] = [];
  const mostGamesSpammedPoorResults: HallOfShameEntry[] = [];
  const biggestDropFromPeak: HallOfShameEntry[] = [];
  const worstChampionStubbornnessList: HallOfShameEntry[] = [];

  for (const p of players) {
    const playerRef: HallOfShamePlayer = {
      id: p.id,
      gameName: p.gameName,
      tagLine: p.tagLine,
    };

    // Exclude remakes from all shame stats
    const matches = withoutRemakes(p.matches);

    const lpChange7d = lpGainedInWindow(p.rankSnapshots, SOLO_QUEUE, since7d);
    if (lpChange7d < 0) {
      const snapshotsInWindow = p.rankSnapshots.filter(
        (s) => s.queueType === SOLO_QUEUE && s.createdAt.getTime() >= since7d.getTime()
      );
      if (snapshotsInWindow.length >= MIN_SNAPSHOTS_FOR_LP) {
        biggestLpLoss7d.push({
          player: playerRef,
          value: lpChange7d,
          label: `${lpChange7d} LP`,
          detail: "last 7 days",
        });
      }
    }

    const wrRecent = winrateLastN(matches, RECENT_GAMES_N);
    if (wrRecent !== null && matches.length >= MIN_GAMES_FOR_WINRATE_OR_DEATHS) {
      worstRecentWinrate.push({
        player: playerRef,
        value: wrRecent,
        label: `${wrRecent.toFixed(1)}% WR`,
        detail: `last ${Math.min(RECENT_GAMES_N, matches.length)} games`,
      });
    }

    const avgDeaths = averageDeathsLastN(
      matches,
      RECENT_GAMES_N,
      MIN_GAMES_FOR_WINRATE_OR_DEATHS
    );
    if (avgDeaths !== null) {
      mostDeathsPerGame.push({
        player: playerRef,
        value: avgDeaths,
        label: `${avgDeaths.toFixed(1)} deaths/game`,
        detail: `last ${Math.min(RECENT_GAMES_N, matches.length)} games`,
      });
    }

    const games7d = totalGamesInWindow(matches, since7d);
    const wr7d = winrateInWindow(matches, since7d);
    if (
      games7d >= MIN_GAMES_FOR_SPAM &&
      wr7d !== null &&
      wr7d < WINRATE_POOR_THRESHOLD
    ) {
      mostGamesSpammedPoorResults.push({
        player: playerRef,
        value: games7d,
        label: `${games7d} games, ${wr7d.toFixed(0)}% WR`,
        detail: "last 7 days",
      });
    }

    const drop = dropFromPeakInWindow(p.rankSnapshots, SOLO_QUEUE, sincePeak);
    if (drop !== null && drop > 0) {
      biggestDropFromPeak.push({
        player: playerRef,
        value: drop,
        label: `-${drop} LP from peak`,
        detail: `peak in last ${WINDOW_PEAK_DAYS}d`,
      });
    }

    const stubborn = worstChampionStubbornness(
      matches,
      MIN_GAMES_FOR_STUBBORN_CHAMP,
      CHAMP_WINRATE_STUBBORN_THRESHOLD
    );
    if (stubborn) {
      worstChampionStubbornnessList.push({
        player: playerRef,
        value: stubborn.score,
        label: `${stubborn.games} games, ${stubborn.winrate.toFixed(0)}% WR`,
        detail: stubborn.championName,
      });
    }
  }

  biggestLpLoss7d.sort((a, b) => a.value - b.value);
  worstRecentWinrate.sort((a, b) => a.value - b.value);
  mostDeathsPerGame.sort((a, b) => b.value - a.value);
  mostGamesSpammedPoorResults.sort((a, b) => b.value - a.value);
  biggestDropFromPeak.sort((a, b) => b.value - a.value);
  worstChampionStubbornnessList.sort((a, b) => b.value - a.value);

  return {
    biggestLpLoss7d,
    worstRecentWinrate,
    mostDeathsPerGame,
    mostGamesSpammedPoorResults,
    biggestDropFromPeak,
    worstChampionStubbornness: worstChampionStubbornnessList,
  };
}

/**
 * Fetches all tracked players with snapshots and match participants, then runs computeHallOfShame.
 */
export async function getHallOfShame(): Promise<HallOfShameResult> {
  const since = daysAgo(Math.max(WINDOW_PEAK_DAYS, 30));

  const players = await prisma.trackedPlayer.findMany({
    include: {
      rankSnapshots: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      matchParticipants: {
        include: { match: { select: { gameStartAt: true, gameDuration: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  const input: PlayerHallOfShameInput[] = players.map((p) => ({
    id: p.id,
    gameName: p.gameName,
    tagLine: p.tagLine,
    rankSnapshots: p.rankSnapshots.map((s) => ({
      queueType: s.queueType,
      leaguePoints: s.leaguePoints,
      createdAt: s.createdAt,
    })),
    matches: p.matchParticipants.map((m) => ({
      win: m.win,
      championName: m.championName,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gameStartAt: m.match.gameStartAt,
      gameDuration: m.match.gameDuration,
    })),
  }));

  return computeHallOfShame(input);
}
