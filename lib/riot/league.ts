/**
 * Riot league-v4 API (ranked entries).
 * Base URL: https://{platform}.api.riotgames.com
 * Uses by-puuid (current); by-summoner is deprecated.
 */

import type { LeagueEntryDto } from "@/types/riot";
import { riotFetch } from "./client";

const BASE = "https://{platform}.api.riotgames.com";

/** Get ranked entries by PUUID (recommended). */
export async function getLeagueEntriesByPuuid(
  platform: string,
  puuid: string
): Promise<LeagueEntryDto[]> {
  const url = `${BASE.replace("{platform}", platform)}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch<LeagueEntryDto[]>(url);
}

/** Get ranked entries by summoner ID (legacy; use by-puuid when possible). */
export async function getLeagueEntriesBySummonerId(
  platform: string,
  summonerId: string
): Promise<LeagueEntryDto[]> {
  const url = `${BASE.replace("{platform}", platform)}/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
  return riotFetch<LeagueEntryDto[]>(url);
}
