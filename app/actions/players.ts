"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { onboardTrackedPlayer, syncPlayer, type SyncPlayerOptions } from "@/lib/riot";
import { isValidPlatform } from "@/lib/riot/regions";
import type { AddPlayerInput } from "@/types/riot";

export type AddPlayerResult =
  | { ok: true; playerId: string; message: string }
  | { ok: false; error: string };

export async function addTrackedPlayer(
  gameName: string,
  tagLine: string,
  region: string
): Promise<AddPlayerResult> {
  const trimmedGameName = gameName.trim();
  const trimmedTagLine = tagLine.trim();
  const trimmedRegion = region.trim().toLowerCase();
  if (!trimmedGameName || !trimmedTagLine || !trimmedRegion) {
    return { ok: false, error: "Game name, tag line and region are required." };
  }
  if (!isValidPlatform(trimmedRegion)) {
    return { ok: false, error: `Unknown region: ${region}. Use e.g. na1, euw1, kr.` };
  }

  try {
    const input: AddPlayerInput = {
      gameName: trimmedGameName,
      tagLine: trimmedTagLine,
      region: trimmedRegion,
    };
    const { id } = await onboardTrackedPlayer(input);
    revalidatePath("/dashboard");
    revalidatePath("/players");
    return { ok: true, playerId: id, message: "Player added. Sync to fetch rank and matches." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add player.";
    return { ok: false, error: message };
  }
}

export type SyncPlayerResult =
  | { ok: true; matchesAdded: number; skippedDueToLock?: boolean }
  | { ok: false; error: string };

const PLAYER_SYNC_LEASE_MS = 4 * 60 * 1000;

function toAffectedCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

function isPlayerSyncLeaseTableMissing(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2010") {
    const meta = typeof e.meta === "object" && e.meta != null ? e.meta : {};
    const code = String((meta as Record<string, unknown>).code ?? "");
    if (code === "42P01") return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /PlayerSyncLease/i.test(msg) && /does not exist|relation .* does not exist/i.test(msg);
}

type SyncLease = {
  acquired: boolean;
  owner: string | null;
  lockEnabled: boolean;
};

async function acquirePlayerSyncLease(playerId: string): Promise<SyncLease> {
  const owner = randomUUID();
  const expiresAt = new Date(Date.now() + PLAYER_SYNC_LEASE_MS);

  try {
    await prisma.$executeRaw`
      DELETE FROM "PlayerSyncLease"
      WHERE "playerId" = ${playerId}
        AND "expiresAt" < NOW()
    `;

    await prisma.$executeRaw`
      INSERT INTO "PlayerSyncLease" ("playerId", "owner", "createdAt", "expiresAt")
      VALUES (${playerId}, ${owner}, NOW(), ${expiresAt})
    `;
    return { acquired: true, owner, lockEnabled: true };
  } catch (e) {
    if (isPlayerSyncLeaseTableMissing(e)) {
      // Migration not deployed yet: continue without a DB lock instead of breaking sync.
      return { acquired: true, owner: null, lockEnabled: false };
    }

    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const updated = await prisma.$executeRaw`
        UPDATE "PlayerSyncLease"
        SET "owner" = ${owner}, "createdAt" = NOW(), "expiresAt" = ${expiresAt}
        WHERE "playerId" = ${playerId}
          AND "expiresAt" < NOW()
      `;

      return {
        acquired: toAffectedCount(updated) > 0,
        owner,
        lockEnabled: true,
      };
    }

    throw e;
  }
}

async function releasePlayerSyncLease(playerId: string, owner: string | null): Promise<void> {
  if (!owner) return;
  try {
    await prisma.$executeRaw`
      DELETE FROM "PlayerSyncLease"
      WHERE "playerId" = ${playerId}
        AND "owner" = ${owner}
    `;
  } catch (e) {
    if (!isPlayerSyncLeaseTableMissing(e)) {
      throw e;
    }
  }
}

type SyncOneOutcome =
  | { status: "synced"; matchesAdded: number }
  | { status: "skipped-locked" }
  | { status: "failed"; error: string };

async function syncOneTrackedPlayer(
  trackedPlayerId: string,
  options?: SyncPlayerOptions
): Promise<SyncOneOutcome> {
  let lease: SyncLease;
  try {
    lease = await acquirePlayerSyncLease(trackedPlayerId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not acquire sync lease.";
    return { status: "failed", error: message };
  }

  if (!lease.acquired) {
    return { status: "skipped-locked" };
  }

  try {
    const { matchesAdded } = await syncPlayer(trackedPlayerId, options);
    return { status: "synced", matchesAdded };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return { status: "failed", error: message };
  } finally {
    await releasePlayerSyncLease(trackedPlayerId, lease.lockEnabled ? lease.owner : null);
  }
}

export async function syncTrackedPlayer(
  trackedPlayerId: string
): Promise<SyncPlayerResult> {
  const outcome = await syncOneTrackedPlayer(trackedPlayerId);
  if (outcome.status === "failed") {
    return { ok: false, error: outcome.error };
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/players");
    revalidatePath(`/players/${trackedPlayerId}`);
    if (outcome.status === "skipped-locked") {
      return { ok: true, matchesAdded: 0, skippedDueToLock: true };
    }
    return { ok: true, matchesAdded: outcome.matchesAdded };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return { ok: false, error: message };
  }
}

export type SyncAllResult =
  | { ok: true; playersSynced: number; playersSkipped: number; totalMatchesAdded: number }
  | {
      ok: false;
      error: string;
      playersSynced?: number;
      playersSkipped?: number;
      totalMatchesAdded?: number;
      errors?: string[];
    };

/**
 * Bulk sync tuning (still runs in one server action — see note below).
 * Match sync also uses incremental `startTime` by default (lib/riot) so repeat syncs
 * mostly fetch only new games, not full history.
 */
const SYNC_ALL_MATCH_COUNT = 12;
/** Unfiltered fallback list size (default single-player is max(40, 50)=50). Keep lower for 429 safety. */
const SYNC_ALL_FALLBACK_MATCH_LIST = 32;
/** Shared batch concurrency; keep conservative for Riot personal key limits. */
const SYNC_ALL_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.SYNC_ALL_CONCURRENCY ?? "4", 10) || 4
);

const syncAllOptions: SyncPlayerOptions = {
  matchCount: SYNC_ALL_MATCH_COUNT,
  fallbackMatchListSize: SYNC_ALL_FALLBACK_MATCH_LIST,
};

/**
 * Syncs every tracked player with lighter caps and conservative concurrency.
 *
 * **If this still times out or you want scale:** move work off the request thread — e.g.
 * a DB-backed job queue + worker, Vercel Cron calling an internal route that syncs *one*
 * player per run (cursor in DB), or Inngest/Trigger.dev with delays. The Riot client already
 * retries 429s; incremental match sync reduces call volume on every run after the first.
 */
export async function syncAllPlayers(): Promise<SyncAllResult> {
  try {
    const players = await prisma.trackedPlayer.findMany({
      select: { id: true },
    });

    if (players.length === 0) {
      return { ok: true, playersSynced: 0, playersSkipped: 0, totalMatchesAdded: 0 };
    }

    let totalMatchesAdded = 0;
    let playersSynced = 0;
    let playersSkipped = 0;
    const errors: string[] = [];

    const concurrency = Math.min(SYNC_ALL_CONCURRENCY, players.length);
    let cursor = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= players.length) break;

        const { id } = players[index]!;
        const outcome = await syncOneTrackedPlayer(id, syncAllOptions);

        if (outcome.status === "synced") {
          playersSynced += 1;
          totalMatchesAdded += outcome.matchesAdded;
          continue;
        }
        if (outcome.status === "skipped-locked") {
          playersSkipped += 1;
          continue;
        }
        errors.push(`${id.slice(0, 8)}…: ${outcome.error}`);
      }
    });

    await Promise.all(workers);

    revalidatePath("/dashboard");
    revalidatePath("/players");
    for (const { id } of players) {
      revalidatePath(`/players/${id}`);
    }

    if (playersSynced === 0 && playersSkipped === 0) {
      return {
        ok: false,
        error: "All syncs failed.",
        playersSynced: 0,
        playersSkipped: 0,
        totalMatchesAdded: 0,
        errors,
      };
    }

    return {
      ok: true,
      playersSynced,
      playersSkipped,
      totalMatchesAdded,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync all failed.";
    return { ok: false, error: message };
  }
}

const CRON_CURSOR_ID = "singleton";

/** When `CronSyncState` table is missing on prod (migration not run), rotate by time slot (15 min). */
const FALLBACK_ROLL_SLOT_MS = 15 * 60 * 1000;

function isCronSyncTableMissing(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021") return true;
    if (e.code === "P1001" || e.code === "P1017") return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /CronSyncState|cron_sync_state/i.test(msg) && /does not exist|Unknown model|not found/i.test(msg);
}

export type SyncNextPlayerResult =
  | {
      ok: true;
      matchesAdded: number;
    skippedDueToLock?: boolean;
      playerId: string;
      gameName: string;
      step: number;
      total: number;
    }
  | { ok: false; error: string };

/**
 * Sync exactly one tracked player (next in rotation), for short cron timeouts (e.g. 30s).
 * Persists cursor in `CronSyncState` so each cron tick advances through the roster.
 */
export async function syncNextPlayerForCron(): Promise<SyncNextPlayerResult> {
  try {
    const players = await prisma.trackedPlayer.findMany({
      select: { id: true, gameName: true },
      orderBy: { id: "asc" },
    });

    if (players.length === 0) {
      return {
        ok: true,
        matchesAdded: 0,
        playerId: "",
        gameName: "",
        step: 0,
        total: 0,
      };
    }

    let nextIndex = 0;
    let cursorFromDb = true;

    try {
      const state = await prisma.cronSyncState.findUnique({
        where: { id: CRON_CURSOR_ID },
      });
      if (state?.lastPlayerId) {
        const idx = players.findIndex((p) => p.id === state.lastPlayerId);
        nextIndex = idx >= 0 ? (idx + 1) % players.length : 0;
      }
    } catch (e) {
      if (!isCronSyncTableMissing(e)) throw e;
      cursorFromDb = false;
      nextIndex = Math.floor(Date.now() / FALLBACK_ROLL_SLOT_MS) % players.length;
    }

    const target = players[nextIndex]!;

    const outcome = await syncOneTrackedPlayer(target.id, syncAllOptions);
    if (outcome.status === "failed") {
      return { ok: false, error: outcome.error };
    }

    if (cursorFromDb) {
      try {
        await prisma.cronSyncState.upsert({
          where: { id: CRON_CURSOR_ID },
          create: { id: CRON_CURSOR_ID, lastPlayerId: target.id },
          update: { lastPlayerId: target.id },
        });
      } catch (e) {
        if (!isCronSyncTableMissing(e)) throw e;
        // Table still missing — sync succeeded; rotation uses time fallback until migrate deploy.
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/players");
    revalidatePath(`/players/${target.id}`);

    return {
      ok: true,
      matchesAdded: outcome.status === "synced" ? outcome.matchesAdded : 0,
      ...(outcome.status === "skipped-locked" ? { skippedDueToLock: true } : {}),
      playerId: target.id,
      gameName: target.gameName,
      step: nextIndex + 1,
      total: players.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync step failed.";
    return { ok: false, error: message };
  }
}

export async function getTrackedPlayers() {
  return prisma.trackedPlayer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      rankSnapshots: {
        where: { queueType: "RANKED_SOLO_5x5" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}
