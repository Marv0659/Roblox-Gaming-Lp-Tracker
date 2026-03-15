/**
 * Live game status for tracked players.
 * Uses Riot spectator-v5; server-side only.
 * Optional in-memory cache to avoid spamming Riot on repeated page loads.
 */

import { prisma } from "@/lib/db";
import { getActiveGameBySummonerId } from "@/lib/riot/spectator";
import { RiotApiError } from "@/lib/riot/client";

// ---- Queue ID to user-friendly label (common queues) ----

const QUEUE_LABELS: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  400: "Normal Draft",
  450: "ARAM",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
  // Add more as needed; unknown queues fall back to "Unknown Queue"
};

export function getQueueLabel(queueId: number): string {
  return QUEUE_LABELS[queueId] ?? "Unknown Queue";
}

/** Ranked Solo/Duo = 420. Used to show "In Ranked" when applicable. */
export const RANKED_SOLO_DUO_QUEUE_ID = 420;

export function isRankedSoloDuo(queueId: number): boolean {
  return queueId === RANKED_SOLO_DUO_QUEUE_ID;
}

// ---- Live status type ----

export interface LiveStatus {
  isInGame: boolean;
  queueId?: number;
  queueLabel?: string;
  isRankedSoloDuo?: boolean;
  championId?: number;
  gameStartTime?: number; // Unix ms
  elapsedSeconds?: number;
  statusLabel: string;
  error?: string; // e.g. rate limit, missing summoner
}

// ---- Optional cache (TTL 45s to balance freshness vs Riot rate limits) ----

const CACHE_TTL_MS = 45_000;
const statusCache = new Map<
  string,
  { status: LiveStatus; fetchedAt: number }
>();

function getCached(playerId: string): LiveStatus | null {
  const entry = statusCache.get(playerId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    statusCache.delete(playerId);
    return null;
  }
  return entry.status;
}

function setCached(playerId: string, status: LiveStatus): void {
  statusCache.set(playerId, { status, fetchedAt: Date.now() });
}

// ---- Service layer ----

/**
 * Returns live game status for a tracked player.
 * Handles: not in game, missing summonerId, Riot errors (returns status with error message).
 */
export async function getPlayerLiveStatus(
  trackedPlayerId: string,
  useCache: boolean = true
): Promise<LiveStatus> {
  if (useCache) {
    const cached = getCached(trackedPlayerId);
    if (cached) return cached;
  }

  const player = await prisma.trackedPlayer.findUnique({
    where: { id: trackedPlayerId },
    select: { summonerId: true, region: true },
  });

  if (!player) {
    const status: LiveStatus = {
      isInGame: false,
      statusLabel: "Offline",
      error: "Player not found",
    };
    return status;
  }

  if (!player.summonerId) {
    const status: LiveStatus = {
      isInGame: false,
      statusLabel: "Offline",
      error: "Summoner ID unknown; sync may fix",
    };
    if (useCache) setCached(trackedPlayerId, status);
    return status;
  }

  try {
    const activeGame = await getActiveGameBySummonerId(
      player.region,
      player.summonerId
    );

    if (!activeGame) {
      const status: LiveStatus = {
        isInGame: false,
        statusLabel: "Not In Game",
      };
      if (useCache) setCached(trackedPlayerId, status);
      return status;
    }

    const participant = activeGame.participants.find(
      (p) => p.summonerId === player.summonerId
    );
    const now = Date.now();
    const elapsedSeconds = Math.floor(
      (now - activeGame.gameStartTime) / 1000
    );

    const queueLabel = getQueueLabel(activeGame.gameQueueConfigId);
    const isRanked = isRankedSoloDuo(activeGame.gameQueueConfigId);
    let statusLabel: string;
    if (isRanked) statusLabel = "In Ranked";
    else if (activeGame.gameQueueConfigId === 440) statusLabel = "In Flex";
    else statusLabel = "In Game";

    const status: LiveStatus = {
      isInGame: true,
      queueId: activeGame.gameQueueConfigId,
      queueLabel,
      isRankedSoloDuo: isRanked,
      championId: participant?.championId,
      gameStartTime: activeGame.gameStartTime,
      elapsedSeconds,
      statusLabel,
    };
    if (useCache) setCached(trackedPlayerId, status);
    return status;
  } catch (e) {
    const errorMessage =
      e instanceof RiotApiError
        ? e.status === 429
          ? "Rate limited; try again shortly"
          : `Riot API error ${e.status}`
        : e instanceof Error
          ? e.message
          : "Unknown error";
    const status: LiveStatus = {
      isInGame: false,
      statusLabel: "Offline",
      error: errorMessage,
    };
    if (useCache) setCached(trackedPlayerId, status);
    return status;
  }
}

/**
 * Returns live status for all tracked players.
 * Uses cache per player to avoid N Riot calls on every request.
 * Use for dashboard "who's in game" at your own rate-limit risk; prefer single-player status on profile.
 */
export async function getTrackedPlayersLiveStatuses(
  useCache: boolean = true
): Promise<Map<string, LiveStatus>> {
  const players = await prisma.trackedPlayer.findMany({
    select: { id: true },
  });
  const map = new Map<string, LiveStatus>();
  for (const p of players) {
    map.set(p.id, await getPlayerLiveStatus(p.id, useCache));
  }
  return map;
}
