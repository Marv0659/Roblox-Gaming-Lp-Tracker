/**
 * Rank event detection and persistence.
 * When a new rank snapshot is created, we compare with the previous snapshot and optionally
 * create RankEvent records (PLACED, PROMOTED, DEMOTED, NEW_PEAK, REACHED_100_LP).
 * Structure is notification-friendly: later you can trigger Discord/email from these events.
 */

import { prisma } from "@/lib/db";
import { rankToScore, isPromotion, isDemotion, type RankLike } from "@/lib/rank-utils";

export const RANK_EVENT_TYPES = [
  "PLACED",
  "PROMOTED",
  "DEMOTED",
  "NEW_PEAK",
  "REACHED_100_LP",
] as const;
export type RankEventType = (typeof RANK_EVENT_TYPES)[number];

export interface SnapshotLike {
  id?: string;
  tier: string;
  rank: string;
  leaguePoints: number;
}

export interface RankEventToCreate {
  eventType: RankEventType;
  tierBefore: string | null;
  rankBefore: string | null;
  leaguePointsBefore: number | null;
  tierAfter: string;
  rankAfter: string;
  leaguePointsAfter: number;
}

/**
 * Pure: given previous snapshot (or null for first), new snapshot, and max rank score before this snapshot,
 * returns which events to create. No DB.
 */
export function getRankEventsToCreate(
  previousSnapshot: SnapshotLike | null,
  newSnapshot: SnapshotLike,
  maxRankScoreBeforeNew: number
): RankEventToCreate[] {
  const events: RankEventToCreate[] = [];
  const after: RankLike = {
    tier: newSnapshot.tier,
    rank: newSnapshot.rank,
    leaguePoints: newSnapshot.leaguePoints,
  };

  if (!previousSnapshot) {
    events.push({
      eventType: "PLACED",
      tierBefore: null,
      rankBefore: null,
      leaguePointsBefore: null,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
    events.push({
      eventType: "NEW_PEAK",
      tierBefore: null,
      rankBefore: null,
      leaguePointsBefore: null,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
    return events;
  }

  const before: RankLike = {
    tier: previousSnapshot.tier,
    rank: previousSnapshot.rank,
    leaguePoints: previousSnapshot.leaguePoints,
  };

  if (isPromotion(before, after)) {
    events.push({
      eventType: "PROMOTED",
      tierBefore: previousSnapshot.tier,
      rankBefore: previousSnapshot.rank,
      leaguePointsBefore: previousSnapshot.leaguePoints,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
  }
  if (isDemotion(before, after)) {
    events.push({
      eventType: "DEMOTED",
      tierBefore: previousSnapshot.tier,
      rankBefore: previousSnapshot.rank,
      leaguePointsBefore: previousSnapshot.leaguePoints,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
  }

  const newScore = rankToScore(after);
  if (newScore > maxRankScoreBeforeNew) {
    events.push({
      eventType: "NEW_PEAK",
      tierBefore: previousSnapshot.tier,
      rankBefore: previousSnapshot.rank,
      leaguePointsBefore: previousSnapshot.leaguePoints,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
  }

  // Reached 100 LP (e.g. entered promos): previous < 100 and new >= 100
  if (
    previousSnapshot.leaguePoints < 100 &&
    newSnapshot.leaguePoints >= 100
  ) {
    events.push({
      eventType: "REACHED_100_LP",
      tierBefore: previousSnapshot.tier,
      rankBefore: previousSnapshot.rank,
      leaguePointsBefore: previousSnapshot.leaguePoints,
      tierAfter: newSnapshot.tier,
      rankAfter: newSnapshot.rank,
      leaguePointsAfter: newSnapshot.leaguePoints,
    });
  }

  return events;
}

/**
 * Persists rank events for a newly created snapshot. Call from sync after creating a RankSnapshot.
 * - Fetches max rank score for this player+queue before this snapshot (for NEW_PEAK).
 * - Creates one RankEvent per detected event type.
 * Future: after creating events, you can iterate and trigger Discord/email notifications here.
 */
export async function persistRankEventsForNewSnapshot(
  trackedPlayerId: string,
  queueType: string,
  previousSnapshot: SnapshotLike | null,
  newSnapshot: SnapshotLike & { id: string; createdAt: Date }
): Promise<void> {
  let maxRankScoreBeforeNew = -1;
  const newCreatedAt = newSnapshot.createdAt;
  const snapshotsBefore = await prisma.rankSnapshot.findMany({
    where: {
      trackedPlayerId,
      queueType,
      createdAt: { lt: newCreatedAt },
    },
    select: { tier: true, rank: true, leaguePoints: true },
  });
  for (const s of snapshotsBefore) {
    const score = rankToScore({ tier: s.tier, rank: s.rank, leaguePoints: s.leaguePoints });
    if (score > maxRankScoreBeforeNew) maxRankScoreBeforeNew = score;
  }

  const toCreate = getRankEventsToCreate(
    previousSnapshot,
    newSnapshot,
    maxRankScoreBeforeNew
  );

  for (const e of toCreate) {
    await prisma.rankEvent.create({
      data: {
        trackedPlayerId,
        eventType: e.eventType,
        queueType,
        tierBefore: e.tierBefore,
        rankBefore: e.rankBefore,
        leaguePointsBefore: e.leaguePointsBefore,
        tierAfter: e.tierAfter,
        rankAfter: e.rankAfter,
        leaguePointsAfter: e.leaguePointsAfter,
        rankSnapshotId: newSnapshot.id,
      },
    });
    // Future: trigger notification (e.g. Discord webhook, email) based on e.eventType and trackedPlayerId.
  }
}

// ---- Backfill (e.g. production has snapshots but no events) ----

/** One-time backfill per process to avoid repeated work. */
let backfillAttempted = false;

/**
 * Creates RankEvent rows from existing RankSnapshots. Safe to run multiple times (skips snapshots that already have events).
 * Use when production has snapshot data but no events (e.g. DB copy, or sync ran before event logic existed).
 */
export async function backfillRankEventsFromSnapshots(): Promise<{ created: number }> {
  const pairs = await prisma.rankSnapshot.groupBy({
    by: ["trackedPlayerId", "queueType"],
  });
  let created = 0;
  for (const { trackedPlayerId, queueType } of pairs) {
    const snapshots = await prisma.rankSnapshot.findMany({
      where: { trackedPlayerId, queueType },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        tier: true,
        rank: true,
        leaguePoints: true,
      },
    });
    let maxRankScoreSoFar = -1;
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const existing = await prisma.rankEvent.count({
        where: { rankSnapshotId: snapshot.id },
      });
      if (existing > 0) {
        const score = rankToScore({
          tier: snapshot.tier,
          rank: snapshot.rank,
          leaguePoints: snapshot.leaguePoints,
        });
        if (score > maxRankScoreSoFar) maxRankScoreSoFar = score;
        continue;
      }
      const previous = i === 0 ? null : (snapshots[i - 1] as SnapshotLike);
      const newSnapshot = {
        ...snapshot,
        createdAt: snapshot.createdAt,
      };
      const toCreate = getRankEventsToCreate(
        previous,
        newSnapshot,
        maxRankScoreSoFar
      );
      for (const e of toCreate) {
        await prisma.rankEvent.create({
          data: {
            trackedPlayerId,
            eventType: e.eventType,
            queueType,
            tierBefore: e.tierBefore,
            rankBefore: e.rankBefore,
            leaguePointsBefore: e.leaguePointsBefore,
            tierAfter: e.tierAfter,
            rankAfter: e.rankAfter,
            leaguePointsAfter: e.leaguePointsAfter,
            rankSnapshotId: snapshot.id,
          },
        });
        created++;
      }
      const score = rankToScore({
        tier: snapshot.tier,
        rank: snapshot.rank,
        leaguePoints: snapshot.leaguePoints,
      });
      if (score > maxRankScoreSoFar) maxRankScoreSoFar = score;
    }
  }
  return { created };
}

// ---- Queries for UI ----

export interface RankEventDisplay {
  id: string;
  createdAt: Date;
  eventType: RankEventType;
  queueType: string;
  tierBefore: string | null;
  rankBefore: string | null;
  leaguePointsBefore: number | null;
  tierAfter: string;
  rankAfter: string;
  leaguePointsAfter: number;
  trackedPlayerId: string;
  gameName?: string;
  tagLine?: string;
}

/** Recent rank events across all tracked players (for dashboard). */
export async function getRecentRankEvents(
  limit: number = 20,
  skipBackfill?: boolean
): Promise<RankEventDisplay[]> {
  const rows = await prisma.rankEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      trackedPlayer: {
        select: { id: true, gameName: true, tagLine: true },
      },
    },
  });

  // If no events but we have snapshots, backfill once per process (e.g. production after deploy).
  if (rows.length === 0 && !skipBackfill && !backfillAttempted) {
    const snapshotCount = await prisma.rankSnapshot.count();
    if (snapshotCount > 0) {
      backfillAttempted = true;
      await backfillRankEventsFromSnapshots();
      return getRecentRankEvents(limit, true);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    eventType: r.eventType as RankEventType,
    queueType: r.queueType,
    tierBefore: r.tierBefore,
    rankBefore: r.rankBefore,
    leaguePointsBefore: r.leaguePointsBefore,
    tierAfter: r.tierAfter,
    rankAfter: r.rankAfter,
    leaguePointsAfter: r.leaguePointsAfter,
    trackedPlayerId: r.trackedPlayerId,
    gameName: r.trackedPlayer.gameName,
    tagLine: r.trackedPlayer.tagLine,
  }));
}

/** Recent rank events for one player (for player page milestones). */
export async function getRecentRankEventsForPlayer(
  trackedPlayerId: string,
  limit: number = 15
): Promise<RankEventDisplay[]> {
  const rows = await prisma.rankEvent.findMany({
    where: { trackedPlayerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      trackedPlayer: {
        select: { id: true, gameName: true, tagLine: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    eventType: r.eventType as RankEventType,
    queueType: r.queueType,
    tierBefore: r.tierBefore,
    rankBefore: r.rankBefore,
    leaguePointsBefore: r.leaguePointsBefore,
    tierAfter: r.tierAfter,
    rankAfter: r.rankAfter,
    leaguePointsAfter: r.leaguePointsAfter,
    trackedPlayerId: r.trackedPlayerId,
    gameName: r.trackedPlayer.gameName,
    tagLine: r.trackedPlayer.tagLine,
  }));
}
