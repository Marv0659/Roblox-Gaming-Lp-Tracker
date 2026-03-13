/**
 * Leaderboard and player stats from DB. Used by dashboard and player pages.
 * Extension: add date range filtering for LP gain/loss over timeframe.
 */

import { prisma } from "@/lib/db";

export const SOLO_QUEUE = "RANKED_SOLO_5x5";
export const FLEX_QUEUE = "RANKED_FLEX_SR";
export const QUEUE_OPTIONS = [
  { value: SOLO_QUEUE, label: "Solo / Duo" },
  { value: FLEX_QUEUE, label: "Flex 5v5" },
] as const;

// Tier order for sorting (lowest = worst)
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

const RANK_ORDER: Record<string, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
  "": 4, // Master+
};

function tierRankSortKey(tier: string, rank: string, lp: number): number {
  const t = TIER_ORDER[tier] ?? -1;
  const r = RANK_ORDER[rank] ?? -1;
  return t * 10000 + r * 1000 + lp;
}

export interface LeaderboardEntry {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number | null;
  snapshotAt: Date;
}

export type LeaderboardFilters = {
  region?: string;
  queue?: string;
};

/**
 * Get current leaderboard: latest snapshot per player for the given queue, optional region filter, ordered by rank then LP.
 */
export async function getLeaderboard(
  filters: LeaderboardFilters = {}
): Promise<LeaderboardEntry[]> {
  const queue = filters.queue ?? SOLO_QUEUE;
  const players = await prisma.trackedPlayer.findMany({
    where: filters.region ? { region: filters.region } : undefined,
    include: {
      rankSnapshots: {
        where: { queueType: queue },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const entries: LeaderboardEntry[] = [];
  for (const p of players) {
    const snap = p.rankSnapshots[0];
    if (!snap) continue;
    const total = snap.wins + snap.losses;
    entries.push({
      id: p.id,
      gameName: p.gameName,
      tagLine: p.tagLine,
      region: p.region,
      tier: snap.tier,
      rank: snap.rank,
      leaguePoints: snap.leaguePoints,
      wins: snap.wins,
      losses: snap.losses,
      winrate: total > 0 ? (snap.wins / total) * 100 : null,
      snapshotAt: snap.createdAt,
    });
  }

  entries.sort(
    (a, b) =>
      tierRankSortKey(b.tier, b.rank, b.leaguePoints) -
      tierRankSortKey(a.tier, a.rank, a.leaguePoints)
  );
  return entries;
}

/** Get distinct regions from tracked players (for filter dropdowns). */
export async function getLeaderboardRegions(): Promise<string[]> {
  const rows = await prisma.trackedPlayer.findMany({
    select: { region: true },
    distinct: ["region"],
    orderBy: { region: "asc" },
  });
  return rows.map((r) => r.region);
}

export interface MatchDetailParticipant {
  id: string;
  gameName: string;
  tagLine: string;
  championName: string | null;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  cs: number;
  gold: number;
  damageDealt: number;
  visionScore: number;
}

export interface MatchDetail {
  id: string;
  riotMatchId: string;
  gameStartAt: Date;
  gameDuration: number;
  queueId: number;
  participants: MatchDetailParticipant[];
}

/** Get one match by our DB id (cuid) with all tracked participants. */
export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        include: { trackedPlayer: true },
      },
    },
  });
  if (!match) return null;
  return {
    id: match.id,
    riotMatchId: match.riotMatchId,
    gameStartAt: match.gameStartAt,
    gameDuration: match.gameDuration,
    queueId: match.queueId,
    participants: match.participants.map((p) => ({
      id: p.trackedPlayer.id,
      gameName: p.trackedPlayer.gameName,
      tagLine: p.trackedPlayer.tagLine,
      championName: p.championName,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      win: p.win,
      cs: p.cs,
      gold: p.gold,
      damageDealt: p.damageDealt,
      visionScore: p.visionScore,
    })),
  };
}

import type { DerivedPlayerStats } from "@/lib/derived-stats";
import { computeDerivedPlayerStats } from "@/lib/derived-stats";

/** Player fun/social stats; computed by derived-stats layer from existing DB data. */
export type PlayerFunStats = DerivedPlayerStats;

export interface PlayerDetail {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  routingRegion: string;
  puuid: string;
  funStats: PlayerFunStats;
  currentRank: {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number | null;
    snapshotAt: Date;
  } | null;
  recentSnapshots: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    createdAt: Date;
  }>;
  recentMatches: Array<{
    id: string;
    matchDbId: string;
    matchId: string;
    championName: string | null;
    kills: number;
    deaths: number;
    assists: number;
    win: boolean;
    cs: number;
    gold: number;
    damageDealt: number;
    visionScore: number;
    gameStartAt: Date;
    gameDuration: number;
  }>;
}

export async function getPlayerDetail(trackedPlayerId: string): Promise<PlayerDetail | null> {
  const player = await prisma.trackedPlayer.findUnique({
    where: { id: trackedPlayerId },
    include: {
      rankSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 60,
      },
      matchParticipants: {
        include: { match: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });
  if (!player) return null;

  const soloSnap = player.rankSnapshots.find((s) => s.queueType === SOLO_QUEUE);
  const total = soloSnap ? soloSnap.wins + soloSnap.losses : 0;

  const funStats = computeDerivedPlayerStats(
    {
      rankSnapshots: player.rankSnapshots.map((s) => ({
        queueType: s.queueType,
        leaguePoints: s.leaguePoints,
        createdAt: s.createdAt,
      })),
      matches: player.matchParticipants.map((m) => ({
        win: m.win,
        championName: m.championName,
        kills: m.kills,
        deaths: m.deaths,
        assists: m.assists,
        gameStartAt: m.match.gameStartAt,
      })),
    },
    { queueType: SOLO_QUEUE }
  );

  return {
    id: player.id,
    gameName: player.gameName,
    tagLine: player.tagLine,
    region: player.region,
    routingRegion: player.routingRegion,
    puuid: player.puuid,
    funStats,
    currentRank: soloSnap
      ? {
          queueType: soloSnap.queueType,
          tier: soloSnap.tier,
          rank: soloSnap.rank,
          leaguePoints: soloSnap.leaguePoints,
          wins: soloSnap.wins,
          losses: soloSnap.losses,
          winrate: total > 0 ? (soloSnap.wins / total) * 100 : null,
          snapshotAt: soloSnap.createdAt,
        }
      : null,
    recentSnapshots: player.rankSnapshots.map((s) => ({
      queueType: s.queueType,
      tier: s.tier,
      rank: s.rank,
      leaguePoints: s.leaguePoints,
      wins: s.wins,
      losses: s.losses,
      createdAt: s.createdAt,
    })),
    recentMatches: player.matchParticipants.map((mp) => ({
      id: mp.id,
      matchDbId: mp.match.id,
      matchId: mp.match.riotMatchId,
      championName: mp.championName,
      kills: mp.kills,
      deaths: mp.deaths,
      assists: mp.assists,
      win: mp.win,
      cs: mp.cs,
      gold: mp.gold,
      damageDealt: mp.damageDealt,
      visionScore: mp.visionScore,
      gameStartAt: mp.match.gameStartAt,
      gameDuration: mp.match.gameDuration,
    })),
  };
}
