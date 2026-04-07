/**
 * Hall of fame: data-driven "best of" rankings — positive mirror of hall of shame.
 * Uses same synced DB data and derived-stats utilities.
 */

import { prisma } from "@/lib/db";
import {
  daysAgo,
  lpGainedInWindow,
  winrateLastN,
  computeChampionStats,
  totalGamesInWindow,
  getBestChampionByWinrate,
  withoutRemakes,
  type RankSnapshotInput,
  type MatchParticipantInput,
} from "@/lib/derived-stats";

const SOLO_QUEUE = "RANKED_SOLO_5x5";

const WINDOW_7D_DAYS = 7;
const WINDOW_PEAK_DAYS = 30;
const MIN_SNAPSHOTS_FOR_LP = 2;
const MIN_GAMES_FOR_WINRATE_OR_DEATHS = 5;
const RECENT_GAMES_N = 20;
const MIN_GAMES_FOR_GRIND = 3;
const WINRATE_GREAT_THRESHOLD = 60;
const MIN_GAMES_FOR_CHAMP_MASTERY = 4;
const CHAMP_WINRATE_MASTERY_THRESHOLD = 60;

export interface HallOfFamePlayer {
  id: string;
  gameName: string;
  tagLine: string;
}

export interface HallOfFameEntry {
  player: HallOfFamePlayer;
  value: number;
  label: string;
  detail?: string;
}

export interface HallOfFameResult {
  biggestLpGain7d: HallOfFameEntry[];
  bestRecentWinrate: HallOfFameEntry[];
  fewestDeathsPerGame: HallOfFameEntry[];
  mostGamesGreatResults: HallOfFameEntry[];
  biggestClimbFromLow: HallOfFameEntry[];
  bestChampionMastery: HallOfFameEntry[];
}

export interface PlayerHallOfFameInput {
  id: string;
  gameName: string;
  tagLine: string;
  rankSnapshots: RankSnapshotInput[];
  matches: MatchParticipantInput[];
}

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

function winrateInWindow(
  matches: MatchParticipantInput[],
  since: Date
): number | null {
  const inWindow = matches.filter((m) => m.gameStartAt.getTime() >= since.getTime());
  if (inWindow.length === 0) return null;
  const wins = inWindow.filter((m) => m.win).length;
  return (wins / inWindow.length) * 100;
}

/** Climb from lowest LP in window to latest LP. Null if &lt; 2 snapshots. */
function climbFromLowInWindow(
  snapshots: RankSnapshotInput[],
  queueType: string,
  since: Date
): number | null {
  const inWindow = snapshots
    .filter((s) => s.queueType === queueType && s.createdAt.getTime() >= since.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (inWindow.length < MIN_SNAPSHOTS_FOR_LP) return null;
  const minLp = Math.min(...inWindow.map((s) => s.leaguePoints));
  const latestLp = inWindow[inWindow.length - 1].leaguePoints;
  const climb = latestLp - minLp;
  return climb > 0 ? climb : null;
}

/** Best champ by winrate with >= minGames and WR >= threshold. Score = games for tie-break. */
function bestChampionMastery(
  matches: MatchParticipantInput[],
  minGames: number,
  minWinrate: number
): { score: number; championName: string; games: number; winrate: number } | null {
  const best = getBestChampionByWinrate(
    computeChampionStats(matches),
    minGames
  );
  if (!best || best.winrate < minWinrate) return null;
  return {
    score: best.games,
    championName: best.championName,
    games: best.games,
    winrate: best.winrate,
  };
}

export function computeHallOfFame(
  players: PlayerHallOfFameInput[]
): HallOfFameResult {
  const since7d = daysAgo(WINDOW_7D_DAYS);
  const sincePeak = daysAgo(WINDOW_PEAK_DAYS);

  const biggestLpGain7d: HallOfFameEntry[] = [];
  const bestRecentWinrate: HallOfFameEntry[] = [];
  const fewestDeathsPerGame: HallOfFameEntry[] = [];
  const mostGamesGreatResults: HallOfFameEntry[] = [];
  const biggestClimbFromLow: HallOfFameEntry[] = [];
  const bestChampionMasteryList: HallOfFameEntry[] = [];

  for (const p of players) {
    const playerRef: HallOfFamePlayer = {
      id: p.id,
      gameName: p.gameName,
      tagLine: p.tagLine,
    };

    const matches = withoutRemakes(p.matches);

    const lpChange7d = lpGainedInWindow(p.rankSnapshots, SOLO_QUEUE, since7d);
    if (lpChange7d > 0) {
      const snapshotsInWindow = p.rankSnapshots.filter(
        (s) => s.queueType === SOLO_QUEUE && s.createdAt.getTime() >= since7d.getTime()
      );
      if (snapshotsInWindow.length >= MIN_SNAPSHOTS_FOR_LP) {
        biggestLpGain7d.push({
          player: playerRef,
          value: lpChange7d,
          label: `+${lpChange7d} LP`,
          detail: "last 7 days",
        });
      }
    }

    const wrRecent = winrateLastN(matches, RECENT_GAMES_N);
    if (wrRecent !== null && matches.length >= MIN_GAMES_FOR_WINRATE_OR_DEATHS) {
      bestRecentWinrate.push({
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
      fewestDeathsPerGame.push({
        player: playerRef,
        value: avgDeaths,
        label: `${avgDeaths.toFixed(1)} deaths/game`,
        detail: `last ${Math.min(RECENT_GAMES_N, matches.length)} games`,
      });
    }

    const games7d = totalGamesInWindow(matches, since7d);
    const wr7d = winrateInWindow(matches, since7d);
    if (
      games7d >= MIN_GAMES_FOR_GRIND &&
      wr7d !== null &&
      wr7d >= WINRATE_GREAT_THRESHOLD
    ) {
      mostGamesGreatResults.push({
        player: playerRef,
        value: games7d,
        label: `${games7d} games, ${wr7d.toFixed(0)}% WR`,
        detail: "last 7 days",
      });
    }

    const climb = climbFromLowInWindow(p.rankSnapshots, SOLO_QUEUE, sincePeak);
    if (climb !== null && climb > 0) {
      biggestClimbFromLow.push({
        player: playerRef,
        value: climb,
        label: `+${climb} LP from low`,
        detail: `low in last ${WINDOW_PEAK_DAYS}d`,
      });
    }

    const mastery = bestChampionMastery(
      matches,
      MIN_GAMES_FOR_CHAMP_MASTERY,
      CHAMP_WINRATE_MASTERY_THRESHOLD
    );
    if (mastery) {
      bestChampionMasteryList.push({
        player: playerRef,
        value: mastery.score,
        label: `${mastery.games} games, ${mastery.winrate.toFixed(0)}% WR`,
        detail: mastery.championName,
      });
    }
  }

  biggestLpGain7d.sort((a, b) => b.value - a.value);
  bestRecentWinrate.sort((a, b) => b.value - a.value);
  fewestDeathsPerGame.sort((a, b) => a.value - b.value);
  mostGamesGreatResults.sort((a, b) => b.value - a.value);
  biggestClimbFromLow.sort((a, b) => b.value - a.value);
  bestChampionMasteryList.sort((a, b) => b.value - a.value);

  return {
    biggestLpGain7d,
    bestRecentWinrate,
    fewestDeathsPerGame,
    mostGamesGreatResults,
    biggestClimbFromLow,
    bestChampionMastery: bestChampionMasteryList,
  };
}

export async function getHallOfFame(): Promise<HallOfFameResult> {
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

  const input: PlayerHallOfFameInput[] = players.map((p) => ({
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

  return computeHallOfFame(input);
}
