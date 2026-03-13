/**
 * Riot account-v1 API.
 * Base URL: https://{region}.api.riotgames.com
 * Region = americas | europe | asia | sea
 */

import type { RiotAccountDto } from "@/types/riot";
import { riotFetch } from "./client";

const BASE = "https://{region}.api.riotgames.com";

export async function getAccountByRiotId(
  routingRegion: string,
  gameName: string,
  tagLine: string
): Promise<RiotAccountDto> {
  const encodedGameName = encodeURIComponent(gameName);
  const encodedTagLine = encodeURIComponent(tagLine);
  const url = `${BASE.replace("{region}", routingRegion)}/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`;
  return riotFetch<RiotAccountDto>(url);
}
