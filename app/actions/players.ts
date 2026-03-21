"use server";

import { revalidatePath } from "next/cache";
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
  | { ok: true; matchesAdded: number }
  | { ok: false; error: string };

export async function syncTrackedPlayer(
  trackedPlayerId: string
): Promise<SyncPlayerResult> {
  try {
    const { matchesAdded } = await syncPlayer(trackedPlayerId);
    revalidatePath("/dashboard");
    revalidatePath("/players");
    revalidatePath(`/players/${trackedPlayerId}`);
    return { ok: true, matchesAdded };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return { ok: false, error: message };
  }
}

export type SyncAllResult =
  | { ok: true; playersSynced: number; totalMatchesAdded: number }
  | { ok: false; error: string; playersSynced?: number; totalMatchesAdded?: number; errors?: string[] };

/**
 * Bulk sync tuning (still runs in one server action — see note below).
 * Match sync also uses incremental `startTime` by default (lib/riot) so repeat syncs
 * mostly fetch only new games, not full history.
 */
const SYNC_ALL_MATCH_COUNT = 12;
/** Unfiltered fallback list size (default single-player is max(40, 50)=50). Keep lower for 429 safety. */
const SYNC_ALL_FALLBACK_MATCH_LIST = 32;
/** Pause between players so concurrent Riot budget isn’t blown (serial sync-all). */
const SYNC_ALL_DELAY_MS = 750;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const syncAllOptions: SyncPlayerOptions = {
  matchCount: SYNC_ALL_MATCH_COUNT,
  fallbackMatchListSize: SYNC_ALL_FALLBACK_MATCH_LIST,
};

/**
 * Syncs every tracked player sequentially with lighter caps.
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
      return { ok: true, playersSynced: 0, totalMatchesAdded: 0 };
    }

    let totalMatchesAdded = 0;
    let playersSynced = 0;
    const errors: string[] = [];

    // One player at a time + lighter match fetch caps — avoids Riot 429 when syncing the whole squad.
    for (let i = 0; i < players.length; i++) {
      const { id } = players[i];
      try {
        const result = await syncPlayer(id, syncAllOptions);
        playersSynced += 1;
        totalMatchesAdded += result.matchesAdded;
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Sync failed";
        errors.push(`${id.slice(0, 8)}…: ${reason}`);
      }
      if (i + 1 < players.length) {
        await delay(SYNC_ALL_DELAY_MS);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/players");
    for (const { id } of players) {
      revalidatePath(`/players/${id}`);
    }

    if (playersSynced === 0) {
      return {
        ok: false,
        error: "All syncs failed.",
        playersSynced: 0,
        totalMatchesAdded: 0,
        errors,
      };
    }

    return {
      ok: true,
      playersSynced,
      totalMatchesAdded,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync all failed.";
    return { ok: false, error: message };
  }
}

const CRON_CURSOR_ID = "singleton";

export type SyncNextPlayerResult =
  | {
      ok: true;
      matchesAdded: number;
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

    const state = await prisma.cronSyncState.findUnique({
      where: { id: CRON_CURSOR_ID },
    });

    let nextIndex = 0;
    if (state?.lastPlayerId) {
      const idx = players.findIndex((p) => p.id === state.lastPlayerId);
      nextIndex = idx >= 0 ? (idx + 1) % players.length : 0;
    }

    const target = players[nextIndex]!;

    const result = await syncPlayer(target.id, syncAllOptions);

    await prisma.cronSyncState.upsert({
      where: { id: CRON_CURSOR_ID },
      create: { id: CRON_CURSOR_ID, lastPlayerId: target.id },
      update: { lastPlayerId: target.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/players");
    revalidatePath(`/players/${target.id}`);

    return {
      ok: true,
      matchesAdded: result.matchesAdded,
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
