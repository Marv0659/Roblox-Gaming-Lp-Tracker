/**
 * Session recap: short-window (today, last 24h) summary of ranked activity.
 * Uses only DB data (RankSnapshot, MatchParticipant, Match). No Riot API.
 * Structured for optional custom window later.
 */

import { prisma } from "@/lib/db";
import { isRemake } from "@/lib/derived-stats";

const SOLO_QUEUE = "RANKED_SOLO_5x5";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ------------ Session window ------------
export type SessionWindowPreset = "today" | "last24h";

export interface SessionWindow {
  start: Date;
  end: Date;
  preset: SessionWindowPreset;
}

export function getSessionWindow(preset: SessionWindowPreset): SessionWindow {
  const end = new Date();
  let start: Date;
  if (preset === "today") {
    start = new Date(end);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }
  return { start, end, preset };
}

// ------------ Match performance scoring (tunable) ------------
const MATCH_WIN_BONUS = 50;
const KDA_SCALE = 10; // (k+a)/max(1,d) * KDA_SCALE
const DEATH_PENALTY_PER_DEATH = 2;
const DAMAGE_PER_1K = 0.5; // damage/1000 adds to score
const GOLD_PER_1K = 0.1;
const MIN_GAMES_FOR_SESSION_STATS = 1;
const MIN_GAMES_FOR_MVP_FRAUD = 2; // avoid 1-game nonsense

/**
 * Single match performance score (higher = better game).
 * Win bonus + KDA component - death penalty + damage/gold normalization.
 */
function matchPerformanceScore(m: {
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  gold: number;
  gameDurationMinutes: number;
}): number {
  const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;
  const deathPenalty = m.deaths * DEATH_PENALTY_PER_DEATH;
  const durationMinutes = Math.max(1, m.gameDurationMinutes || 20);
  const damageScore = (m.damageDealt / 1000) * DAMAGE_PER_1K;
  const goldScore = (m.gold / 1000) * GOLD_PER_1K;
  return (
    (m.win ? MATCH_WIN_BONUS : 0) +
    kda * KDA_SCALE -
    deathPenalty +
    damageScore +
    goldScore
  );
}

// ------------ Session MVP / Fraud scoring (tunable) ------------
const MVP_LP_WEIGHT = 0.4;
const MVP_WINRATE_WEIGHT = 0.3;
const MVP_BEST_MATCH_WEIGHT = 0.25;
const MVP_GAMES_WEIGHT = 0.05; // small bonus for playing
const FRAUD_LP_WEIGHT = 0.4; // negative LP = bad
const FRAUD_WINRATE_WEIGHT = 0.35; // (100 - WR) = bad
const FRAUD_WORST_MATCH_WEIGHT = 0.25;

// ------------ Output types ------------
export interface SessionPlayerLp {
  playerId: string;
  gameName: string;
  tagLine: string;
  netLp: number | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winrate: number | null;
}

export interface SessionMatchHighlight {
  playerId: string;
  gameName: string;
  tagLine: string;
  championName: string | null;
  matchId: string;
  gameStartAt: Date;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  gold: number;
  score: number;
  reason: string; // short human reason
}

export interface SessionMvpFraud {
  playerId: string;
  gameName: string;
  tagLine: string;
  score: number;
  reason: string;
  netLp: number | null;
  gamesPlayed: number;
  winrate: number | null;
}

export interface SessionRecapData {
  window: SessionWindow;
  playerLp: SessionPlayerLp[];
  biggestWinner: SessionPlayerLp | null;
  biggestLoser: SessionPlayerLp | null;
  bestMatch: SessionMatchHighlight | null;
  worstCollapse: SessionMatchHighlight | null;
  sessionMvp: SessionMvpFraud | null;
  sessionFraud: SessionMvpFraud | null;
}

// ------------ Data fetch ------------
interface PlayerSessionInput {
  playerId: string;
  gameName: string;
  tagLine: string;
  lpChange: number | null;
  matches: {
    matchId: string;
    gameStartAt: Date;
    gameDuration: number;
    win: boolean;
    championName: string | null;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    gold: number;
    damageDealt: number;
    visionScore: number;
  }[];
}

async function getSessionData(
  window: SessionWindow,
  queueType: string
): Promise<PlayerSessionInput[]> {
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
      include: {
        match: {
          select: {
            id: true,
            gameStartAt: true,
            gameDuration: true,
          },
        },
      },
      orderBy: { match: { gameStartAt: "desc" } },
    }),
  ]);

  const snapsByPlayer = new Map<string, { leaguePoints: number; createdAt: Date }[]>();
  for (const s of snapshots) {
    const list = snapsByPlayer.get(s.trackedPlayerId) ?? [];
    list.push({ leaguePoints: s.leaguePoints, createdAt: s.createdAt });
    snapsByPlayer.set(s.trackedPlayerId, list);
  }

  const result: PlayerSessionInput[] = [];

  for (const player of players) {
    const snaps = (snapsByPlayer.get(player.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    let lpChange: number | null = null;
    if (snaps.length >= 2) {
      lpChange = snaps[snaps.length - 1].leaguePoints - snaps[0].leaguePoints;
    }

    const playerParts = participants.filter((p) => p.trackedPlayerId === player.id);
    const matches = playerParts
      .map((p) => ({
        matchId: p.match.id,
        gameStartAt: p.match.gameStartAt,
        gameDuration: p.match.gameDuration ?? 0,
        win: p.win,
        championName: p.championName,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        cs: p.cs ?? 0,
        gold: p.gold ?? 0,
        damageDealt: p.damageDealt ?? 0,
        visionScore: p.visionScore ?? 0,
      }))
      .filter((m) => !isRemake(m));

    result.push({
      playerId: player.id,
      gameName: player.gameName,
      tagLine: player.tagLine,
      lpChange,
      matches,
    });
  }

  return result;
}

// ------------ Build recap ------------
function buildRecap(input: PlayerSessionInput[], window: SessionWindow): SessionRecapData {
  const playerLp: SessionPlayerLp[] = input.map((p) => {
    const games = p.matches.length;
    const wins = p.matches.filter((m) => m.win).length;
    const winrate = games > 0 ? (wins / games) * 100 : null;
    return {
      playerId: p.playerId,
      gameName: p.gameName,
      tagLine: p.tagLine,
      netLp: p.lpChange,
      gamesPlayed: games,
      wins,
      losses: games - wins,
      winrate,
    };
  });

  const withLp = playerLp.filter((p) => p.netLp !== null && p.gamesPlayed >= MIN_GAMES_FOR_SESSION_STATS);
  const biggestWinner =
    withLp.length === 0
      ? null
      : withLp.reduce((a, b) => ((a.netLp ?? -Infinity) > (b.netLp ?? -Infinity) ? a : b));
  const biggestLoser =
    withLp.length === 0
      ? null
      : withLp.reduce((a, b) => ((a.netLp ?? Infinity) < (b.netLp ?? Infinity) ? a : b));

  const allMatches: {
    player: PlayerSessionInput;
    m: (typeof input[0]["matches"])[0];
    score: number;
  }[] = [];
  for (const player of input) {
    for (const m of player.matches) {
      const durationMinutes = (m.gameDuration || 0) / 60 || 20;
      const score = matchPerformanceScore({
        win: m.win,
        kills: m.kills,
        deaths: m.deaths,
        assists: m.assists,
        damageDealt: m.damageDealt,
        gold: m.gold,
        gameDurationMinutes: durationMinutes,
      });
      allMatches.push({ player, m, score });
    }
  }

  const bestMatchEntry =
    allMatches.length === 0
      ? null
      : allMatches.reduce((a, b) => (a.score >= b.score ? a : b));
  const worstCollapseEntry =
    allMatches.length === 0
      ? null
      : allMatches.reduce((a, b) => (a.score <= b.score ? a : b));

  const bestMatch: SessionMatchHighlight | null = bestMatchEntry
    ? {
        playerId: bestMatchEntry.player.playerId,
        gameName: bestMatchEntry.player.gameName,
        tagLine: bestMatchEntry.player.tagLine,
        championName: bestMatchEntry.m.championName,
        matchId: bestMatchEntry.m.matchId,
        gameStartAt: bestMatchEntry.m.gameStartAt,
        win: bestMatchEntry.m.win,
        kills: bestMatchEntry.m.kills,
        deaths: bestMatchEntry.m.deaths,
        assists: bestMatchEntry.m.assists,
        damageDealt: bestMatchEntry.m.damageDealt,
        gold: bestMatchEntry.m.gold,
        score: bestMatchEntry.score,
        reason: bestMatchEntry.m.win
          ? `W ${bestMatchEntry.m.kills}/${bestMatchEntry.m.deaths}/${bestMatchEntry.m.assists}`
          : `L ${bestMatchEntry.m.kills}/${bestMatchEntry.m.deaths}/${bestMatchEntry.m.assists}`,
      }
    : null;

  const worstCollapse: SessionMatchHighlight | null = worstCollapseEntry
    ? {
        playerId: worstCollapseEntry.player.playerId,
        gameName: worstCollapseEntry.player.gameName,
        tagLine: worstCollapseEntry.player.tagLine,
        championName: worstCollapseEntry.m.championName,
        matchId: worstCollapseEntry.m.matchId,
        gameStartAt: worstCollapseEntry.m.gameStartAt,
        win: worstCollapseEntry.m.win,
        kills: worstCollapseEntry.m.kills,
        deaths: worstCollapseEntry.m.deaths,
        assists: worstCollapseEntry.m.assists,
        damageDealt: worstCollapseEntry.m.damageDealt,
        gold: worstCollapseEntry.m.gold,
        score: worstCollapseEntry.score,
        reason: worstCollapseEntry.m.win
          ? `W ${worstCollapseEntry.m.kills}/${worstCollapseEntry.m.deaths}/${worstCollapseEntry.m.assists}`
          : `L ${worstCollapseEntry.m.kills}/${worstCollapseEntry.m.deaths}/${worstCollapseEntry.m.assists}`,
      }
    : null;

  const withEnoughForMvp = input.filter(
    (p) => p.matches.length >= MIN_GAMES_FOR_MVP_FRAUD
  );
  let sessionMvp: SessionMvpFraud | null = null;
  let sessionFraud: SessionMvpFraud | null = null;

  if (withEnoughForMvp.length > 0) {
    const playerScores = withEnoughForMvp.map((p) => {
      const games = p.matches.length;
      const wins = p.matches.filter((m) => m.win).length;
      const winrate = (wins / games) * 100;
      const bestSingleScore =
        p.matches.length > 0
          ? Math.max(
              ...p.matches.map((m) =>
                matchPerformanceScore({
                  win: m.win,
                  kills: m.kills,
                  deaths: m.deaths,
                  assists: m.assists,
                  damageDealt: m.damageDealt,
                  gold: m.gold,
                  gameDurationMinutes: (m.gameDuration || 0) / 60 || 20,
                })
              )
            )
          : 0;
      const lpNorm = Math.max(-50, Math.min(50, p.lpChange ?? 0)); // clamp for scale
      const mvpScore =
        MVP_LP_WEIGHT * lpNorm +
        MVP_WINRATE_WEIGHT * winrate +
        MVP_BEST_MATCH_WEIGHT * Math.min(100, bestSingleScore) +
        MVP_GAMES_WEIGHT * Math.min(10, games);
      return {
        player: p,
        mvpScore,
        fraudScore:
          FRAUD_LP_WEIGHT * Math.abs(Math.min(0, p.lpChange ?? 0)) +
          FRAUD_WINRATE_WEIGHT * (100 - winrate) +
          FRAUD_WORST_MATCH_WEIGHT *
            (100 -
              Math.min(
                100,
                Math.max(
                  0,
                  ...p.matches.map((m) =>
                    matchPerformanceScore({
                      win: m.win,
                      kills: m.kills,
                      deaths: m.deaths,
                      assists: m.assists,
                      damageDealt: m.damageDealt,
                      gold: m.gold,
                      gameDurationMinutes: (m.gameDuration || 0) / 60 || 20,
                    })
                  )
                )
              )),
        netLp: p.lpChange,
        gamesPlayed: games,
        winrate,
      };
    });

    const mvpEntry = playerScores.reduce((a, b) =>
      a.mvpScore >= b.mvpScore ? a : b
    );
    sessionMvp = {
      playerId: mvpEntry.player.playerId,
      gameName: mvpEntry.player.gameName,
      tagLine: mvpEntry.player.tagLine,
      score: mvpEntry.mvpScore,
      reason: `${mvpEntry.gamesPlayed} games, ${mvpEntry.winrate.toFixed(0)}% WR${mvpEntry.netLp != null ? `, ${mvpEntry.netLp >= 0 ? "+" : ""}${mvpEntry.netLp} LP` : ""}`,
      netLp: mvpEntry.netLp,
      gamesPlayed: mvpEntry.gamesPlayed,
      winrate: mvpEntry.winrate,
    };

    const fraudEntry = playerScores.reduce((a, b) =>
      a.fraudScore >= b.fraudScore ? a : b
    );
    sessionFraud = {
      playerId: fraudEntry.player.playerId,
      gameName: fraudEntry.player.gameName,
      tagLine: fraudEntry.player.tagLine,
      score: fraudEntry.fraudScore,
      reason: `${fraudEntry.gamesPlayed} games, ${fraudEntry.winrate.toFixed(0)}% WR${fraudEntry.netLp != null && fraudEntry.netLp < 0 ? `, ${fraudEntry.netLp} LP` : ""}`,
      netLp: fraudEntry.netLp,
      gamesPlayed: fraudEntry.gamesPlayed,
      winrate: fraudEntry.winrate,
    };
  }

  return {
    window,
    playerLp,
    biggestWinner: biggestWinner ?? null,
    biggestLoser: biggestLoser ?? null,
    bestMatch,
    worstCollapse,
    sessionMvp,
    sessionFraud,
  };
}

/**
 * Returns session recap for the given preset (today or last 24h).
 * All data from DB only; no Riot API.
 */
export async function getSessionRecap(
  preset: SessionWindowPreset = "last24h"
): Promise<SessionRecapData> {
  const window = getSessionWindow(preset);
  const input = await getSessionData(window, SOLO_QUEUE);
  return buildRecap(input, window);
}
