/**
 * Riot lol-challenges-v1 API.
 * Platform endpoint: https://{platform}.api.riotgames.com
 * e.g. euw1.api.riotgames.com, na1.api.riotgames.com
 */

import type { PlayerChallengeDataDto } from "@/types/riot";
import { riotFetch } from "./client";

const BASE = "https://{platform}.api.riotgames.com";

/**
 * Fetch all challenge data for a player by puuid from the platform endpoint.
 * Returns null if the player has no challenge data (404) or on any API error.
 */
export async function getPlayerChallengeData(
  platform: string,
  puuid: string
): Promise<PlayerChallengeDataDto | null> {
  const url = `${BASE.replace("{platform}", platform)}/lol/challenges/v1/player-data/${encodeURIComponent(puuid)}`;
  try {
    return await riotFetch<PlayerChallengeDataDto>(url);
  } catch {
    return null;
  }
}
