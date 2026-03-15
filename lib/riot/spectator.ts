/**
 * Riot spectator-v5 API: active game (current game) by summoner.
 * Returns 404 when the summoner is not in a live game.
 * Server-side only; do not expose to client.
 */

import type { ActiveGameDto } from "@/types/riot";
import { riotFetch } from "./client";
import { RiotApiError } from "./client";

const BASE = "https://{platform}.api.riotgames.com";

/**
 * Get active game for a summoner if they are in one.
 * Returns null when not in game (404) or when API key is missing.
 * Throws on other errors (e.g. rate limit 429).
 */
export async function getActiveGameBySummonerId(
  platform: string,
  summonerId: string
): Promise<ActiveGameDto | null> {
  try {
    const url = `${BASE.replace("{platform}", platform)}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(summonerId)}`;
    return await riotFetch<ActiveGameDto>(url);
  } catch (e) {
    if (e instanceof RiotApiError && e.status === 404) return null;
    throw e;
  }
}
