"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { onboardTrackedPlayer, syncPlayer } from "@/lib/riot";
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

const SYNC_ALL_CONCURRENCY = 3;

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

    for (let i = 0; i < players.length; i += SYNC_ALL_CONCURRENCY) {
      const chunk = players.slice(i, i + SYNC_ALL_CONCURRENCY);

      const settled = await Promise.allSettled(
        chunk.map(async ({ id }) => {
          const result = await syncPlayer(id);
          return { id, matchesAdded: result.matchesAdded };
        })
      );

      for (const item of settled) {
        if (item.status === "fulfilled") {
          playersSynced += 1;
          totalMatchesAdded += item.value.matchesAdded;
        } else {
          const reason = item.reason instanceof Error ? item.reason.message : "Sync failed";
          const failedId =
            chunk[settled.indexOf(item)]?.id?.slice(0, 8) ?? "unknown";
          errors.push(`${failedId}…: ${reason}`);
        }
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
